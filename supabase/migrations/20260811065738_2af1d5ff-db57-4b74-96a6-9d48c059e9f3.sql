CREATE TABLE public.user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.user_documents TO authenticated;
GRANT ALL ON public.user_documents TO service_role;

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
  ON public.user_documents FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can add their own documents"
  ON public.user_documents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own documents"
  ON public.user_documents FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_user_documents_user_id ON public.user_documents(user_id, uploaded_at DESC);

CREATE POLICY "Users can upload their own pension documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pension-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read their own pension documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pension-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own pension documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pension-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
