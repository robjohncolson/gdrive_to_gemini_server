const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager, FileState } = require('@google/generative-ai/server');

// Initialize Gemini and File Manager
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

async function transcribeVideo(fileId, drive) {
  try {
    console.log('Transcription requested for file:', fileId);
    
    // Get the file metadata including webContentLink
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'webContentLink,name'
    });

    // Upload to Gemini using the direct URL
    const uploadResult = await fileManager.uploadFile(file.data.webContentLink, {
      mimeType: 'video/mp4',
      displayName: file.data.name
    });

    // Wait for processing
    let processedFile = await fileManager.getFile(uploadResult.file.name);
    while (processedFile.state === FileState.PROCESSING) {
      console.log('Processing video...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      processedFile = await fileManager.getFile(uploadResult.file.name);
    }

    if (processedFile.state === FileState.FAILED) {
      throw new Error('Video processing failed');
    }

    // Generate transcription
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([
      "Please provide a detailed transcription of this video's content and dialogue.",
      {
        fileData: {
          fileUri: uploadResult.file.uri,
          mimeType: uploadResult.file.mimeType,
        },
      },
    ]);

    return result.response.text();
  } catch (error) {
    console.error('Error in transcription:', error);
    throw error;
  }
}

module.exports = {
  transcribeVideo
}; 