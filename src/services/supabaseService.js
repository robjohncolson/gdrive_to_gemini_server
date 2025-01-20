const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function createTranscriptionRecord(fileId, fileName) {
  const { data, error } = await supabase
    .from('video_transcriptions')
    .insert([
      { file_id: fileId, file_name: fileName }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateTranscription(fileId, transcription) {
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

  if (error) throw error;
  return data;
}

async function getTranscriptions() {
  const { data, error } = await supabase
    .from('video_transcriptions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

module.exports = {
  createTranscriptionRecord,
  updateTranscription,
  getTranscriptions
}; 