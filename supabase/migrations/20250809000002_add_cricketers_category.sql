-- Add 'Cricketers' category with famous cricketers from around the world
-- Insert as first category (it will appear first when ordered by created_at)
INSERT INTO categories (name, sample_items) VALUES
  ('Cricketers', ARRAY[
    'Virat Kohli', 
    'MS Dhoni', 
    'Rohit Sharma', 
    'Joe Root', 
    'Steve Smith', 
    'Kane Williamson', 
    'Babar Azam', 
    'AB de Villiers',
    'Chris Gayle',
    'David Warner',
    'Ben Stokes',
    'Kagiso Rabada',
    'Jasprit Bumrah',
    'Pat Cummins',
    'Trent Boult',
    'Rashid Khan'
  ]);