const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function transcribeVideo(fileId, drive) {
  try {
    console.log('Transcription requested for file:', fileId);
    
    // Get the file metadata and content
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'webViewLink,name'
    });

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Generate transcription using the webViewLink
    const result = await model.generateContent({
      contents: [{
        parts: [{
          text: "Please transcribe this video content and dialogue from the following URL:",
        }, {
          inlineData: {
            mimeType: "video/mp4",
            data: file.data.webViewLink
          }
        }]
      }]
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error in transcription:', error);
    throw error;
  }
}

module.exports = {
  transcribeVideo
}; 