const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

// Test the connection
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('video_transcriptions')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('Successfully connected to Supabase');
    return true;
  } catch (error) {
    console.error('Supabase connection error:', error);
    return false;
  }
}

async function createTranscriptionRecord(fileId, fileName) {
  try {
    const { data, error } = await supabase
      .from('video_transcriptions')
      .insert([
        { 
          file_id: fileId, 
          file_name: fileName,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating transcription record:', error);
      throw error;
    }
    
    console.log('Created transcription record:', data);
    return data;
  } catch (error) {
    console.error('Failed to create transcription record:', error);
    throw error;
  }
}

async function updateTranscription(fileId, transcription) {
  try {
    const { data, error } = await supabase
      .from('video_transcriptions')
      .update({ 
        transcription: transcription,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .match({ file_id: fileId })
      .select()
      .single();

    if (error) {
      console.error('Error updating transcription:', error);
      throw error;
    }

    console.log('Updated transcription record:', data);
    return data;
  } catch (error) {
    console.error('Failed to update transcription:', error);
    throw error;
  }
}

async function getTranscriptions() {
  try {
    const { data, error } = await supabase
      .from('video_transcriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transcriptions:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch transcriptions:', error);
    throw error;
  }
}

module.exports = {
  testConnection,
  createTranscriptionRecord,
  updateTranscription,
  getTranscriptions
}; 