export type DocumentRow = {
  id: string;
  org_id: string;
  client_id: string;
  request_id: string | null;
  category: string;
  file_path: string;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  visibility: string;
  status: string;
  uploaded_by_user_id: string | null;
  created_at: string;
};