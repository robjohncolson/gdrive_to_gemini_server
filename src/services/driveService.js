const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const { transcribeVideo } = require('./geminiService');
const { createTranscriptionRecord, updateTranscription } = require('./supabaseService');

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const POLLING_INTERVAL = 30000; // 30 seconds

async function initializeDriveWatcher(io) {
  try {
    // Debug logging
    console.log('Service Account Email:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    console.log('Private Key exists:', !!process.env.GOOGLE_PRIVATE_KEY);
    
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
    let lastCheckedTime = new Date().toISOString();

    setInterval(async () => {
      try {
        console.log('Checking for new files...');
        const response = await drive.files.list({
          q: `mimeType contains 'video/mp4' and modifiedTime > '${lastCheckedTime}' and '${process.env.FOLDER_ID}' in parents`,
          fields: 'files(id, name, webViewLink)',
        });

        const newFiles = response.data.files;
        if (newFiles.length > 0) {
          console.log(`Found ${newFiles.length} new files`);
          for (const file of newFiles) {
            console.log(`Processing file: ${file.name}`);
            // Create initial record in Supabase
            const record = await createTranscriptionRecord(file.id, file.name);
            
            // Emit new pending transcription to clients
            io.emit('newPendingTranscription', record);
            
            // Process the transcription
            const transcription = await transcribeVideo(file.id, drive);
            
            // Update record with transcription
            const updatedRecord = await updateTranscription(file.id, transcription);
            
            // Emit completed transcription to clients
            io.emit('transcriptionComplete', updatedRecord);
          }
        }

        lastCheckedTime = new Date().toISOString();
      } catch (error) {
        console.error('Error checking for new files:', error);
        if (error.response) {
          console.error('Error response:', error.response.data);
        }
      }
    }, POLLING_INTERVAL);

  } catch (error) {
    console.error('Error initializing drive watcher:', error);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
  }
}

module.exports = { initializeDriveWatcher }; 