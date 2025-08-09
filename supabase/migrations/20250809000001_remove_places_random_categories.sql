-- Remove 'Places' and 'Random' categories
DELETE FROM categories WHERE name IN ('Places', 'Random');