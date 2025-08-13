-- Expand sample items for all categories to provide more variety

-- Animals - Add more diverse animals
UPDATE categories 
SET sample_items = ARRAY[
  'dog', 'cat', 'elephant', 'lion', 'penguin', 'dolphin', 'eagle', 'snake',
  'tiger', 'bear', 'whale', 'shark', 'butterfly', 'spider', 'kangaroo', 'giraffe',
  'zebra', 'monkey', 'wolf', 'fox', 'rabbit', 'turtle', 'frog', 'octopus',
  'horse', 'cow', 'pig', 'chicken', 'duck', 'owl', 'parrot', 'crocodile',
  'cheetah', 'leopard', 'rhino', 'hippo', 'camel', 'deer', 'moose', 'raccoon',
  'hamster', 'guinea pig', 'ferret', 'hedgehog', 'squirrel', 'chipmunk', 'beaver', 'otter',
  'seal', 'walrus', 'manatee', 'narwhal', 'jellyfish', 'starfish', 'crab', 'lobster',
  'shrimp', 'seahorse', 'eel', 'stingray', 'barracuda', 'tuna', 'salmon', 'goldfish',
  'peacock', 'flamingo', 'pelican', 'heron', 'crane', 'swan', 'goose', 'robin',
  'sparrow', 'cardinal', 'blue jay', 'woodpecker', 'hummingbird', 'falcon', 'hawk', 'vulture',
  'bat', 'mole', 'groundhog', 'porcupine', 'skunk', 'opossum', 'armadillo', 'sloth',
  'anteater', 'platypus', 'koala', 'wombat', 'tasmanian devil', 'lemur', 'baboon', 'orangutan',
  'gorilla', 'chimpanzee', 'gibbon', 'macaque', 'meerkat', 'mongoose', 'hyena', 'jackal',
  'lynx', 'bobcat', 'puma', 'jaguar', 'panther', 'snow leopard', 'serval', 'caracal'
]
WHERE name = 'Animals';

-- Objects - Add more diverse objects
UPDATE categories 
SET sample_items = ARRAY[
  'chair', 'computer', 'phone', 'book', 'car', 'bicycle', 'television', 'lamp',
  'table', 'keyboard', 'mouse', 'watch', 'camera', 'guitar', 'piano', 'knife',
  'fork', 'spoon', 'plate', 'cup', 'bottle', 'pen', 'pencil', 'mirror',
  'wallet', 'backpack', 'shoes', 'hat', 'sunglasses', 'umbrella', 'toothbrush', 'soap',
  'towel', 'pillow', 'blanket', 'clock', 'calendar', 'remote', 'headphones', 'charger',
  'scissors', 'screwdriver', 'hammer', 'drill', 'wrench', 'pliers', 'saw', 'nail',
  'screw', 'bolt', 'nut', 'washer', 'tape', 'glue', 'stapler', 'paperclip',
  'rubber band', 'magnifying glass', 'compass', 'ruler', 'calculator', 'eraser', 'sharpener', 'crayon',
  'marker', 'highlighter', 'notebook', 'folder', 'binder', 'envelope', 'stamp', 'postcard',
  'magazine', 'newspaper', 'dictionary', 'atlas', 'map', 'globe', 'telescope', 'microscope',
  'binoculars', 'flashlight', 'candle', 'lighter', 'matches', 'fire extinguisher', 'smoke detector', 'thermometer',
  'scale', 'measuring cup', 'timer', 'stopwatch', 'alarm clock', 'hourglass', 'calendar', 'diary',
  'journal', 'photo album', 'picture frame', 'poster', 'painting', 'sculpture', 'vase', 'flower pot',
  'watering can', 'garden hose', 'shovel', 'rake', 'broom', 'mop', 'vacuum', 'dustpan'
]
WHERE name = 'Objects';

-- Cricket Players - Add more diverse players from different eras and countries
UPDATE categories 
SET sample_items = ARRAY[
  'Virat Kohli', 'MS Dhoni', 'Rohit Sharma', 'Joe Root', 'Steve Smith', 'Kane Williamson', 'Babar Azam', 'AB de Villiers',
  'Chris Gayle', 'David Warner', 'Ben Stokes', 'Kagiso Rabada', 'Jasprit Bumrah', 'Pat Cummins', 'Trent Boult', 'Rashid Khan',
  'Sachin Tendulkar', 'Brian Lara', 'Ricky Ponting', 'Jacques Kallis', 'Shane Warne', 'Muttiah Muralitharan', 'Glenn McGrath', 'Wasim Akram',
  'Viv Richards', 'Don Bradman', 'Kapil Dev', 'Imran Khan', 'Shane Bond', 'Brett Lee', 'Shoaib Akhtar', 'Dale Steyn',
  'Kumar Sangakkara', 'Mahela Jayawardene', 'Angelo Mathews', 'Lasith Malinga', 'Shakib Al Hasan', 'Tamim Iqbal', 'Mushfiqur Rahim', 'Quinton de Kock',
  'Hardik Pandya', 'KL Rahul', 'Shikhar Dhawan', 'Ajinkya Rahane', 'Cheteshwar Pujara', 'Rishabh Pant', 'Mohammed Shami', 'Bhuvneshwar Kumar',
  'Yuzvendra Chahal', 'Kuldeep Yadav', 'Mohammed Siraj', 'Shardul Thakur', 'Ishan Kishan', 'Suryakumar Yadav', 'Shreyas Iyer', 'Deepak Chahar',
  'Jonny Bairstow', 'Jos Buttler', 'Eoin Morgan', 'Jason Roy', 'Moeen Ali', 'Adil Rashid', 'Chris Woakes', 'Jofra Archer',
  'Sam Curran', 'Liam Livingstone', 'Mark Wood', 'Ollie Robinson', 'James Anderson', 'Stuart Broad', 'Dawid Malan', 'Harry Brook',
  'Marnus Labuschagne', 'Josh Hazlewood', 'Mitchell Starc', 'Nathan Lyon', 'Adam Zampa', 'Marcus Stoinis', 'Glenn Maxwell', 'Aaron Finch',
  'Mitchell Marsh', 'Alex Carey', 'Cameron Green', 'Josh Inglis', 'Sean Abbott', 'Ashton Agar', 'Tim David', 'Matthew Wade',
  'Faf du Plessis', 'Aiden Markram', 'Rassie van der Dussen', 'David Miller', 'Anrich Nortje', 'Marco Jansen', 'Lungi Ngidi', 'Tabraiz Shamsi'
]
WHERE name = 'Cricket Players';

-- Football Players - Add more diverse players from different positions and countries
UPDATE categories 
SET sample_items = ARRAY[
  'Lionel Messi', 'Cristiano Ronaldo', 'Neymar Jr', 'Kylian Mbappé', 'Kevin De Bruyne', 'Robert Lewandowski', 'Virgil van Dijk', 'Mohamed Salah',
  'Sadio Mané', 'Luka Modrić', 'Karim Benzema', 'Erling Haaland', 'Pedri', 'Gavi', 'Vinicius Jr', 'Jude Bellingham',
  'Sergio Ramos', 'Gerard Piqué', 'Thiago Silva', 'N''Golo Kanté', 'Paul Pogba', 'Bruno Fernandes', 'Marcus Rashford', 'Harry Kane',
  'Son Heung-min', 'Manuel Neuer', 'Alisson Becker', 'Thibaut Courtois', 'Jan Oblak', 'Gianluigi Donnarumma', 'Casemiro', 'Frenkie de Jong',
  'Mason Mount', 'Phil Foden', 'Jamal Musiala', 'Rafael Leão', 'Victor Osimhen', 'Darwin Núñez', 'Antony', 'Bukayo Saka',
  'Raheem Sterling', 'Jack Grealish', 'Declan Rice', 'Jordan Henderson', 'Kalvin Phillips', 'Conor Gallagher', 'James Maddison', 'Ivan Toney',
  'Dusan Vlahovic', 'Federico Chiesa', 'Nicolo Barella', 'Marco Verratti', 'Lorenzo Insigne', 'Ciro Immobile', 'Alessandro Bastoni', 'Giorgio Chiellini',
  'Sergio Busquets', 'Jordi Alba', 'Ferran Torres', 'Ansu Fati', 'Pablo Gavi', 'Carlos Soler', 'Dani Olmo', 'Alvaro Morata',
  'Thomas Müller', 'Joshua Kimmich', 'Leon Goretzka', 'Serge Gnabry', 'Leroy Sané', 'Kai Havertz', 'Timo Werner', 'Antonio Rüdiger',
  'Presnel Kimpembe', 'Marquinhos', 'Achraf Hakimi', 'Kingsley Coman', 'Christopher Nkunku', 'Ousmane Dembélé', 'Antoine Griezmann', 'Olivier Giroud',
  'Memphis Depay', 'Matthijs de Ligt', 'Frenkie de Jong', 'Virgil van Dijk', 'Stefan de Vrij', 'Denzel Dumfries', 'Cody Gakpo', 'Wout Weghorst',
  'João Félix', 'Rafael Leão', 'Bruno Fernandes', 'Rúben Dias', 'João Cancelo', 'Bernardo Silva', 'Diogo Jota', 'Gonçalo Ramos'
]
WHERE name = 'Football Players';

-- NBA Players - Add more diverse players from different positions and eras
UPDATE categories 
SET sample_items = ARRAY[
  'LeBron James', 'Stephen Curry', 'Kevin Durant', 'Giannis Antetokounmpo', 'Luka Dončić', 'Nikola Jokić', 'Joel Embiid', 'Jayson Tatum',
  'Damian Lillard', 'Jimmy Butler', 'Kawhi Leonard', 'Russell Westbrook', 'Chris Paul', 'James Harden', 'Anthony Davis', 'Klay Thompson',
  'Draymond Green', 'Pascal Siakam', 'Ja Morant', 'Trae Young', 'Zion Williamson', 'Lamelo Ball', 'Anthony Edwards', 'Scottie Barnes',
  'Michael Jordan', 'Kobe Bryant', 'Shaquille O''Neal', 'Magic Johnson', 'Larry Bird', 'Tim Duncan', 'Kareem Abdul-Jabbar', 'Wilt Chamberlain',
  'Bill Russell', 'Hakeem Olajuwon', 'David Robinson', 'Charles Barkley', 'Karl Malone', 'John Stockton', 'Allen Iverson', 'Dirk Nowitzki',
  'Devin Booker', 'Donovan Mitchell', 'Kyrie Irving', 'Bradley Beal', 'CJ McCollum', 'Tyler Herro', 'Jordan Poole', 'Desmond Bane',
  'Tyrese Haliburton', 'Darius Garland', 'Cade Cunningham', 'Jalen Green', 'Evan Mobley', 'Franz Wagner', 'Paolo Banchero', 'Jabari Smith Jr',
  'Bam Adebayo', 'Domantas Sabonis', 'Jaren Jackson Jr', 'Alperen Şengün', 'Chet Holmgren', 'Victor Wembanyama', 'Nic Claxton', 'Isaiah Stewart',
  'Rudy Gobert', 'Clint Capela', 'Robert Williams', 'Mitchell Robinson', 'Jarrett Allen', 'Jusuf Nurkić', 'Steven Adams', 'Andre Drummond',
  'De''Aaron Fox', 'Jrue Holiday', 'Marcus Smart', 'Fred VanVleet', 'Mike Conley', 'Kyle Lowry', 'Terry Rozier', 'Malcolm Brogdon',
  'Paul George', 'Khris Middleton', 'Tobias Harris', 'Gordon Hayward', 'Bojan Bogdanović', 'Harrison Barnes', 'Kelly Oubre Jr', 'Buddy Hield',
  'Robert Covington', 'PJ Tucker', 'Jae Crowder', 'Nicolas Batum', 'Otto Porter Jr', 'Kenyon Martin Jr', 'Caleb Martin', 'Max Strus'
]
WHERE name = 'NBA Players';

-- World Leaders - Add more diverse leaders from different continents and time periods
UPDATE categories 
SET sample_items = ARRAY[
  'Joe Biden', 'Emmanuel Macron', 'Olaf Scholz', 'Justin Trudeau', 'Volodymyr Zelenskyy', 'Narendra Modi', 'Xi Jinping', 'Vladimir Putin',
  'Giorgia Meloni', 'Rishi Sunak', 'Fumio Kishida', 'Moon Jae-in', 'Recep Erdoğan', 'Mohammed bin Salman', 'Benjamin Netanyahu', 'Abdel Fattah el-Sisi',
  'Cyril Ramaphosa', 'William Ruto', 'Nana Akufo-Addo', 'Paul Kagame', 'Jair Bolsonaro', 'Gabriel Boric', 'Gustavo Petro', 'Luis Arce',
  'Anthony Albanese', 'Jacinda Ardern', 'Sanna Marin', 'Mark Rutte', 'Alexander Van der Bellen', 'Frank-Walter Steinmeier', 'Sergio Mattarella', 'Pedro Sánchez',
  'António Costa', 'Mette Frederiksen', 'Stefan Löfven', 'Sauli Niinistö', 'Andrzej Duda', 'Klaus Iohannis', 'Gitanas Nausėda', 'Egils Levits',
  'King Charles III', 'King Felipe VI', 'King Willem-Alexander', 'King Carl XVI Gustaf', 'Queen Margrethe II', 'President Katalin Novák', 'President Petr Pavel', 'President Maia Sandu',
  'Sheikh Mohamed bin Zayed', 'King Abdullah II', 'Sheikh Tamim bin Hamad', 'Sultan Haitham bin Tariq', 'President Kassym-Jomart Tokayev', 'President Shavkat Mirziyoyev', 'President Serdar Berdimuhamedow', 'President Emomali Rahmon',
  'President Gotabaya Rajapaksa', 'Prime Minister Sheikh Hasina', 'Prime Minister Pushpa Kamal Dahal', 'King Jigme Khesar', 'President Thuongsín', 'President Joko Widodo', 'Prime Minister Lee Hsien Loong', 'Sultan Hassanal Bolkiah',
  'President Rodrigo Duterte', 'President Ferdinand Marcos Jr', 'Prime Minister Hun Sen', 'President Thongloun Sisoulith', 'General Min Aung Hlaing', 'President Tsai Ing-wen', 'President Yoon Suk-yeol', 'Prime Minister Ismail Sabri',
  'President Muhammadu Buhari', 'President Bola Tinubu', 'President Macky Sall', 'President Alassane Ouattara', 'President Patrice Talon', 'President Faure Gnassingbé', 'President Alpha Condé', 'President George Weah',
  'President Félix Tshisekedi', 'President Paul Biya', 'President Teodoro Obiang', 'President João Lourenço', 'President Filipe Nyusi', 'President Emmerson Mnangagwa', 'President Hakainde Hichilema', 'President Lazarus Chakwera'
]
WHERE name = 'World Leaders';