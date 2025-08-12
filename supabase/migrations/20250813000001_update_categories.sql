-- Remove Food category and add new categories
DELETE FROM categories WHERE name = 'Food';

-- Add new categories
INSERT INTO categories (name, sample_items) VALUES
  ('Football Players', ARRAY[
    'Lionel Messi', 'Cristiano Ronaldo', 'Neymar Jr', 'Kylian Mbappé', 
    'Kevin De Bruyne', 'Robert Lewandowski', 'Virgil van Dijk', 'Mohamed Salah',
    'Sadio Mané', 'Luka Modrić', 'Karim Benzema', 'Erling Haaland'
  ]),
  ('NBA Players', ARRAY[
    'LeBron James', 'Stephen Curry', 'Kevin Durant', 'Giannis Antetokounmpo',
    'Luka Dončić', 'Nikola Jokić', 'Joel Embiid', 'Jayson Tatum',
    'Damian Lillard', 'Jimmy Butler', 'Kawhi Leonard', 'Russell Westbrook'
  ]),
  ('World Leaders', ARRAY[
    'Joe Biden', 'Emmanuel Macron', 'Olaf Scholz', 'Justin Trudeau',
    'Volodymyr Zelenskyy', 'Narendra Modi', 'Xi Jinping', 'Vladimir Putin',
    'Giorgia Meloni', 'Rishi Sunak', 'Fumio Kishida', 'Moon Jae-in'
  ]);