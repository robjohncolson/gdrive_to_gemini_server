const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const { transcribeVideo } = require('./geminiService');
const { createTranscriptionRecord, updateTranscription } = require('./supabaseService');

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const POLLING_INTERVAL = 30000; // 30 seconds

async function initializeDriveWatcher(io) {
  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: SCOPES,
  });

  const drive = google.drive({ version: 'v3', auth });
  let lastCheckedTime = new Date().toISOString();

  setInterval(async () => {
    try {
      const response = await drive.files.list({
        q: `mimeType contains 'video/mp4' and modifiedTime > '${lastCheckedTime}' and '${process.env.FOLDER_ID}' in parents`,
        fields: 'files(id, name, webViewLink)',
      });

      const newFiles = response.data.files;
      if (newFiles.length > 0) {
        for (const file of newFiles) {
          console.log(`New video detected: ${file.name}`);
          
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
    }
  }, POLLING_INTERVAL);
}

module.exports = { initializeDriveWatcher }; 