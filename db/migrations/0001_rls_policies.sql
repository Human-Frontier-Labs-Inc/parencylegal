-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_request_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dropbox_connections ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can only view their own profile"
ON profiles
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Block direct client writes on profiles"
ON profiles
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Block direct client updates on profiles"
ON profiles
FOR UPDATE
USING (false);

CREATE POLICY "Block direct client deletes on profiles"
ON profiles
FOR DELETE
USING (false);

CREATE POLICY "Service role has full access to profiles"
ON profiles
USING (auth.role() = 'service_role');

-- Cases RLS Policies
CREATE POLICY "Users can only view their own cases"
ON cases
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can insert cases"
ON cases
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update cases"
ON cases
FOR UPDATE
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete cases"
ON cases
FOR DELETE
USING (auth.role() = 'service_role');

-- Documents RLS Policies
CREATE POLICY "Users can only view their own documents"
ON documents
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can insert documents"
ON documents
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update documents"
ON documents
FOR UPDATE
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete documents"
ON documents
FOR DELETE
USING (auth.role() = 'service_role');

-- Discovery Requests RLS Policies
CREATE POLICY "Users can only view their own discovery requests"
ON discovery_requests
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can insert discovery requests"
ON discovery_requests
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update discovery requests"
ON discovery_requests
FOR UPDATE
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete discovery requests"
ON discovery_requests
FOR DELETE
USING (auth.role() = 'service_role');

-- Document Request Mappings RLS Policies
CREATE POLICY "Users can only view their own mappings"
ON document_request_mappings
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can insert mappings"
ON document_request_mappings
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update mappings"
ON document_request_mappings
FOR UPDATE
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete mappings"
ON document_request_mappings
FOR DELETE
USING (auth.role() = 'service_role');

-- AI Chat Sessions RLS Policies
CREATE POLICY "Users can only view their own AI sessions"
ON ai_chat_sessions
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can insert AI sessions"
ON ai_chat_sessions
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update AI sessions"
ON ai_chat_sessions
FOR UPDATE
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete AI sessions"
ON ai_chat_sessions
FOR DELETE
USING (auth.role() = 'service_role');

-- Sync History RLS Policies
CREATE POLICY "Users can only view their own sync history"
ON sync_history
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can insert sync history"
ON sync_history
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update sync history"
ON sync_history
FOR UPDATE
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete sync history"
ON sync_history
FOR DELETE
USING (auth.role() = 'service_role');

-- Dropbox Connections RLS Policies
CREATE POLICY "Users can only view their own Dropbox connection"
ON dropbox_connections
FOR SELECT
USING (auth.uid()::text = user_id);

CREATE POLICY "Service role can insert Dropbox connections"
ON dropbox_connections
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update Dropbox connections"
ON dropbox_connections
FOR UPDATE
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete Dropbox connections"
ON dropbox_connections
FOR DELETE
USING (auth.role() = 'service_role');
