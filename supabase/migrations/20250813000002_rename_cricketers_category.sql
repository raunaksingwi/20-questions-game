-- Rename Cricketers category to Cricket Players for consistency
UPDATE categories 
SET name = 'Cricket Players' 
WHERE name = 'Cricketers';