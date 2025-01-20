const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function transcribeVideo(fileId, drive) {
  try {
    console.log('Transcription requested for file:', fileId);
    
    // Get the file content as a readable stream
    const fileResponse = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, {
      responseType: 'arraybuffer'
    });

    // Convert array buffer to base64
    const base64Data = Buffer.from(fileResponse.data).toString('base64');

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Generate transcription using the actual video data
    const result = await model.generateContent({
      contents: [{
        parts: [{
          text: "Please transcribe this video content and dialogue:",
        }, {
          inlineData: {
            mimeType: "video/mp4",
            data: base64Data
          }
        }]
      }]
    });

    return result.response.text();
  } catch (error) {
    console.error('Error in transcription:', error);
    throw error;
  }
}

module.exports = {
  transcribeVideo
}; 