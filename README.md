# GDrive to Gemini Transcription Server

A **Node.js** server that monitors a Google Drive folder for new video files and generates transcriptions using Google’s Gemini AI.

---

## 🚀 Features
- **Real-time video file monitoring** in Google Drive.
- Automatic transcription generation (**pending Gemini 1.5 Pro**).
- **WebSocket-based real-time updates** for status notifications.
- Integration with **Supabase** for transcription storage.
- **Health monitoring endpoints** for status and service checks.

---

## 📋 Prerequisites
- **Node.js** >= 18.0.0
- A **Google Cloud Platform** account with the Drive API enabled.
- **Supabase** account and project.
- **Google Gemini API key**.

---

## 🔧 Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create a `.env` file** with the following variables:
   ```env
   GOOGLE_DRIVE_FOLDER_ID=<your-google-drive-folder-id>
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_ANON_KEY=<your-supabase-anon-key>
   GEMINI_API_KEY=<your-gemini-api-key>
   ```

---

## 🏃‍♂️ Running the Server

### Development:
```bash
npm run dev
```

### Production:
```bash
npm run start
```

---

## 📐 Architecture

### Core Services:
- **Drive Service**: Monitors a Google Drive folder for new videos.
- **Supabase Service**: Handles database operations for storing transcription data.
- **Gemini Service**: Processes video transcriptions (*currently a placeholder for Gemini 1.5 Pro*).

### WebSocket Events:
- `newPendingTranscription`: Emitted when a new video is detected.
- `transcriptionComplete`: Emitted when a transcription is finished.

---

## 🔍 API Endpoints

- **Health Check**: Returns server and service health status.
- **Ping**: Basic server availability check.

---

## 🔒 Security

- **CORS protection** with an explicit origin list.
- **Socket.IO connection validation** to ensure secure communication.
- **Environment variable validation** to verify configuration at startup.
- **Error handling and sanitization** to prevent data leaks.

---

## 📦 Deployment

The project is preconfigured for deployment on **Railway**. Make sure to:
- Set up the necessary environment variables.
- Configure the restart policy for improved reliability.

---

## ⚠️ Current Limitations

- The Gemini transcription service currently returns **placeholder responses** (awaiting Gemini 1.5 Pro).
- Supports **single folder monitoring** in Google Drive.
- Basic error recovery mechanisms are implemented.

---

## 🛠️ Development

### Project Structure:
- Organized into modular services for scalability and maintainability.

### Error Handling:
Global error handlers are implemented for:
- Uncaught exceptions.
- Unhandled promise rejections.
- API errors.
- Socket connection issues.

---

## 📄 License

This project is licensed under the **MIT License**. Feel free to use and modify as needed.

---

## 🤝 Contributing

1. **Fork the repository**.
2. **Create your feature branch**:
   ```bash
   git checkout -b feature/YourFeatureName
   ```
3. **Commit your changes**:
   ```bash
   git commit -m "Add your message here"
   ```
4. **Push to the branch**:
   ```bash
   git push origin feature/YourFeatureName
   ```
5. **Create a Pull Request**.

---

This README now provides a clear and concise overview of the project, its features, and setup steps.
