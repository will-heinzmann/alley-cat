-- Enable Realtime Authorization on realtime.messages and restrict notification topics to their owner.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own notification channel" ON realtime.messages;

CREATE POLICY "Users can only access their own notification channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'notifications:%'
      THEN realtime.topic() = 'notifications:' || auth.uid()::text
    ELSE true
  END
);
