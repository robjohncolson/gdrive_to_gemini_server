const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const { transcribeVideo } = require('./geminiService');
const { createTranscriptionRecord, updateTranscription } = require('./supabaseService');

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file'
];
const POLLING_INTERVAL = 1800000; // 30 minutes

async function createCompletedFolder(drive, parentFolderId) {
  try {
    // Check if completed folder exists
    const response = await drive.files.list({
      q: `name = 'completed' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
      fields: 'files(id, name)',
    });

    if (response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Create new completed folder
    const folderMetadata = {
      name: 'completed',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    };

    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id'
    });

    return folder.data.id;
  } catch (error) {
    console.error('Error creating completed folder:', error);
    throw error;
  }
}

async function moveFileToCompleted(drive, fileId, completedFolderId) {
  try {
    // Get the file's current parents
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'parents'
    });

    // Move the file to completed folder
    await drive.files.update({
      fileId: fileId,
      addParents: completedFolderId,
      removeParents: file.data.parents.join(','),
      fields: 'id, parents'
    });
  } catch (error) {
    console.error('Error moving file to completed folder:', error);
    throw error;
  }
}

async function processFiles(drive, completedFolderId, io) {
  try {
    // Build the search query according to Drive API syntax
    const query = [
      "mimeType = 'video/mp4'",  // Exact match for MIME type
      `'${process.env.FOLDER_ID}' in parents`,
      `not '${completedFolderId}' in parents`  // Proper NOT syntax
    ].join(' and ').trim();

    console.log('Executing Drive API query:', query); // Debug log

    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, webViewLink)',
      pageSize: 10,
      spaces: 'drive',
      orderBy: 'modifiedTime desc'
    });

    const files = response.data.files || [];
    console.log(`Found ${files.length} files to process`);

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name}`);
        const record = await createTranscriptionRecord(file.id, file.name);
        io.emit('newPendingTranscription', record);
        
        const transcription = await transcribeVideo(file.id, drive);
        const updatedRecord = await updateTranscription(file.id, transcription);
        
        await moveFileToCompleted(drive, file.id, completedFolderId);
        
        io.emit('transcriptionComplete', updatedRecord);
        console.log(`Successfully processed ${file.name}`);
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
      }
    }
  } catch (error) {
    console.error('Drive API Error:', error);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function initializeDriveWatcher(io) {
  try {
    console.log('Initializing Drive Watcher');
    
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

    await auth.authorize();
    console.log('Successfully authenticated with Google');

    const drive = google.drive({ version: 'v3', auth });
    const completedFolderId = await createCompletedFolder(drive, process.env.FOLDER_ID);

    // Initial check on startup
    console.log('Performing initial file check...');
    await processFiles(drive, completedFolderId, io);
    console.log('Initial check complete');

    // Set up periodic checking
    setInterval(async () => {
      console.log('Running periodic check...');
      await processFiles(drive, completedFolderId, io);
    }, POLLING_INTERVAL);

  } catch (error) {
    console.error('Fatal Drive Watcher Error:', error);
    throw error;
  }
}

module.exports = {
  initializeDriveWatcher
}; 