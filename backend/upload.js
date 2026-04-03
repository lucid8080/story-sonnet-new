import dotenv from 'dotenv';
import multiparty from 'multiparty';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new multiparty.Form();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('[Upload] Error parsing form', err);
      return res.status(400).json({ error: 'Invalid upload form data' });
    }

    const bucket = fields.bucket?.[0];
    const file = files.file?.[0];

    if (!bucket || !file) {
      return res.status(400).json({ error: 'Missing bucket or file' });
    }

    try {
      const path = `${Date.now()}-${file.originalFilename}`;

      const fileBuffer = await fsReadFile(file.path);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, fileBuffer, {
          contentType: file.headers['content-type'],
        });

      if (error) {
        console.error('[Upload] Supabase storage error', error);
        return res.status(500).json({ error: 'Upload failed' });
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(data.path);

      await supabase.from('uploads').insert({
        file_name: file.originalFilename,
        file_type: file.headers['content-type'],
        file_url: publicUrl,
        storage_path: data.path,
      });

      return res.status(200).json({
        fileUrl: publicUrl,
        storagePath: data.path,
      });
    } catch (e) {
      console.error('[Upload] Unexpected error', e);
      return res.status(500).json({ error: 'Upload failed' });
    }
  });
}

function fsReadFile(path) {
  return new Promise((resolve, reject) => {
    import('fs').then((fs) => {
      fs.readFile(path, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  });
}

