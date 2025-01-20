const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const { transcribeVideo } = require('./geminiService');
const { createTranscriptionRecord, updateTranscription } = require('./supabaseService');

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const POLLING_INTERVAL = process.env.POLLING_INTERVAL ? parseInt(process.env.POLLING_INTERVAL) : 300000;

async function initializeDriveWatcher(io) {
  try {
    // Debug logging
    console.log('Initializing Drive Watcher with polling interval:', POLLING_INTERVAL);
    console.log('Service Account Email:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    
    // Ensure private key is properly formatted
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !privateKey) {
      throw new Error('Missing required Google credentials');
    }

    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: SCOPES,
    });

    // Test the authentication
    try {
      await auth.authorize();
      console.log('Successfully authenticated with Google');
    } catch (authError) {
      console.error('Authentication failed:', authError);
      throw authError;
    }

    const drive = google.drive({ version: 'v3', auth });
    let lastCheckedTime = new Date(Date.now() - 60000).toISOString(); // Start checking from 1 minute ago

    setInterval(async () => {
      try {
        console.log('Checking for new files since:', lastCheckedTime);
        
        // Test the drive API with a simple query first
        const testQuery = await drive.files.list({
          pageSize: 1,
          fields: 'files(id, name)',
        });
        
        console.log('Test query successful');

        // Proceed with the actual file check
        const response = await drive.files.list({
          q: `mimeType contains 'video/mp4' and modifiedTime > '${lastCheckedTime}' and '${process.env.FOLDER_ID}' in parents`,
          fields: 'files(id, name, webViewLink)',
          pageSize: 10,
        });

        const newFiles = response.data.files;
        console.log('API Response:', JSON.stringify(response.data, null, 2));

        if (newFiles && newFiles.length > 0) {
          console.log(`Found ${newFiles.length} new files`);
          for (const file of newFiles) {
            try {
              console.log(`Processing file: ${file.name}`);
              // Create initial record in Supabase
              const record = await createTranscriptionRecord(file.id, file.name);
              console.log('Created Supabase record:', record);
              
              // Emit new pending transcription to clients
              io.emit('newPendingTranscription', record);
              console.log('Emitted newPendingTranscription event');
              
              // Process the transcription
              const transcription = await transcribeVideo(file.id, drive);
              console.log('Generated transcription');
              
              // Update record with transcription
              const updatedRecord = await updateTranscription(file.id, transcription);
              console.log('Updated Supabase record');
              
              // Emit completed transcription to clients
              io.emit('transcriptionComplete', updatedRecord);
              console.log('Emitted transcriptionComplete event');
            } catch (fileError) {
              console.error(`Error processing file ${file.name}:`, fileError);
              console.error('Error details:', fileError.message);
              if (fileError.response) {
                console.error('Error response:', fileError.response.data);
              }
            }
          }
        }

        lastCheckedTime = new Date().toISOString();
      } catch (error) {
        console.error('Drive API Error:', {
          message: error.message,
          code: error.code,
          errors: error.errors,
          response: error.response?.data,
        });
      }
    }, POLLING_INTERVAL);

  } catch (error) {
    console.error('Fatal Drive Watcher Error:', error);
    throw error; // Rethrow to trigger app restart
  }
}

module.exports = { initializeDriveWatcher }; 