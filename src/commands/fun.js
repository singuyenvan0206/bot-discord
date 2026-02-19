const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

// ═══════════════════════════════════════════════════════════════════
// Data Pools
// ═══════════════════════════════════════════════════════════════════

const TRIVIA_QUESTIONS = [
    { question: 'What is the capital of France?', options: ['London', 'Paris', 'Berlin', 'Madrid'], answer: 1 },
    { question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Jupiter', 'Mars', 'Saturn'], answer: 2 },
    { question: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3 },
    { question: 'Who painted the Mona Lisa?', options: ['Van Gogh', 'Da Vinci', 'Picasso', 'Monet'], answer: 1 },
    { question: 'What is the chemical symbol for Gold?', options: ['Go', 'Gd', 'Au', 'Ag'], answer: 2 },
    { question: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: 2 },
    { question: 'What is the speed of light?', options: ['300,000 km/s', '150,000 km/s', '500,000 km/s', '1,000,000 km/s'], answer: 0 },
    { question: 'Which country has the most population?', options: ['USA', 'India', 'China', 'Indonesia'], answer: 1 },
    { question: 'What year did World War II end?', options: ['1943', '1944', '1945', '1946'], answer: 2 },
    { question: 'What is the smallest country in the world?', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'], answer: 1 },
    { question: 'Which element has the atomic number 1?', options: ['Helium', 'Hydrogen', 'Oxygen', 'Carbon'], answer: 1 },
    { question: 'What is the tallest mountain in the world?', options: ['K2', 'Kangchenjunga', 'Mt. Everest', 'Lhotse'], answer: 2 },
    { question: 'Which animal is known as the King of the Jungle?', options: ['Tiger', 'Lion', 'Elephant', 'Bear'], answer: 1 },
    { question: 'How many bones are in the adult human body?', options: ['186', '206', '226', '256'], answer: 1 },
    { question: 'What is the hardest natural substance?', options: ['Gold', 'Iron', 'Diamond', 'Platinum'], answer: 2 },
    { question: 'Which programming language is Discord bots commonly built with?', options: ['Java', 'Python', 'JavaScript', 'C++'], answer: 2 },
    { question: 'What does "HTTP" stand for?', options: ['HyperText Transfer Protocol', 'High Tech Transfer Protocol', 'HyperText Transmission Process', 'High Transfer Text Protocol'], answer: 0 },
    { question: 'What is the currency of Japan?', options: ['Yuan', 'Won', 'Yen', 'Ringgit'], answer: 2 },
    { question: 'Which planet has the most moons?', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], answer: 1 },
    { question: 'What is the largest organ in the human body?', options: ['Heart', 'Liver', 'Skin', 'Brain'], answer: 2 },
    // New Questions
    { question: 'Who is the main character in "One Piece"?', options: ['Zoro', 'Luffy', 'Sanji', 'Nami'], answer: 1 },
    { question: 'What is the capital of Japan?', options: ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'], answer: 2 },
    { question: 'How many players are in a standard soccer team?', options: ['10', '11', '12', '9'], answer: 1 },
    { question: 'What is the hardest rock?', options: ['Diamond', 'Granite', 'Quartz', 'Marble'], answer: 0 },
    { question: 'Who wrote "Harry Potter"?', options: ['J.R.R. Tolkien', 'George R.R. Martin', 'J.K. Rowling', 'Stephen King'], answer: 2 },
    { question: 'What is the chemical symbol for Water?', options: ['H2O', 'CO2', 'O2', 'NaCl'], answer: 0 },
    { question: 'Which Pokemon is the mascot of the franchise?', options: ['Charmander', 'Pikachu', 'Squirtle', 'Bulbasaur'], answer: 1 },
    { question: 'What year did the Titanic sink?', options: ['1910', '1912', '1915', '1920'], answer: 1 },
    { question: 'Which planet is closest to the Sun?', options: ['Venus', 'Mercury', 'Mars', 'Earth'], answer: 1 },
    { question: 'What is the largest mammal in the world?', options: ['Elephant', 'Blue Whale', 'Giraffe', 'Hippo'], answer: 1 },
    { question: 'How many colors are in a rainbow?', options: ['5', '6', '7', '8'], answer: 2 },
    { question: 'Who invented the telephone?', options: ['Edison', 'Tesla', 'Bell', 'Einstein'], answer: 2 },
    { question: 'What is the main ingredient in Guacamole?', options: ['Tomato', 'Avocado', 'Onion', 'Pepper'], answer: 1 },
    { question: 'Which country invented Pizza?', options: ['France', 'USA', 'Italy', 'Spain'], answer: 2 },
    { question: 'What is the fastest land animal?', options: ['Lion', 'Cheetah', 'Horse', 'Leopard'], answer: 1 },
    { question: 'How many stripes are on the US flag?', options: ['10', '11', '12', '13'], answer: 3 },
    { question: 'Which superhero is Peter Parker?', options: ['Batman', 'Superman', 'Spider-Man', 'Iron Man'], answer: 2 },
    { question: 'What is the boiling point of water?', options: ['90°C', '100°C', '110°C', '120°C'], answer: 1 },
    { question: 'Who painted the "Starry Night"?', options: ['Picasso', 'Van Gogh', 'Da Vinci', 'Monet'], answer: 1 },
    { question: 'Which ocean is the Bermuda Triangle in?', options: ['Pacific', 'Atlantic', 'Indian', 'Arctic'], answer: 1 },
    { question: 'What is the currency of the UK?', options: ['Euro', 'Dollar', 'Pound', 'Franc'], answer: 2 },
    { question: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], answer: 1 },
    { question: 'What is the largest desert in the world?', options: ['Sahara', 'Gobi', 'Arabian', 'Antarctic'], answer: 3 },
    { question: 'Who is known as the "Dark Knight"?', options: ['Superman', 'Batman', 'Flash', 'Wonder Woman'], answer: 1 },
    { question: 'Which gas do plants absorb?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Helium'], answer: 2 },
    { question: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], answer: 2 },
    { question: 'Who discovered gravity?', options: ['Einstein', 'Newton', 'Galileo', 'Hawking'], answer: 1 },
    { question: 'How many teeth does an adult human have?', options: ['28', '30', '32', '34'], answer: 2 },
    { question: 'What is the smallest bird in the world?', options: ['Sparrow', 'Hummingbird', 'Parrot', 'Robin'], answer: 1 },
    { question: 'Which country has the Pyramids?', options: ['Mexico', 'Egypt', 'India', 'Peru'], answer: 1 },
    // ─── MASSIVE EXPANSION: TRIVIA ───
    { question: 'What does CPU stand for?', options: ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Central Processor Unit'], answer: 1 },
    { question: 'Which company owns Xbox?', options: ['Sony', 'Nintendo', 'Microsoft', 'Sega'], answer: 2 },
    { question: 'What is the highest grossing movie of all time?', options: ['Titanic', 'Avengers: Endgame', 'Avatar', 'Star Wars'], answer: 2 },
    { question: 'Which fruit floats on water?', options: ['Grape', 'Apple', 'Mango', 'Banana'], answer: 1 },
    { question: 'How many hearts does an octopus have?', options: ['1', '2', '3', '4'], answer: 2 },
    { question: 'Who is the god of thunder in Norse mythology?', options: ['Loki', 'Odin', 'Thor', 'Hela'], answer: 2 },
    { question: 'What is the chemical symbol for Silver?', options: ['Si', 'Ag', 'Au', 'Sl'], answer: 1 },
    { question: 'Which planet rotates clockwise?', options: ['Mars', 'Venus', 'Jupiter', 'Neptune'], answer: 1 },
    { question: 'Who founded Microsoft?', options: ['Steve Jobs', 'Bill Gates', 'Elon Musk', 'Mark Zuckerberg'], answer: 1 },
    { question: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Make Language', 'Home Tool Markup Language'], answer: 0 },
    { question: 'Which chess piece can only move diagonally?', options: ['Rook', 'Knight', 'Bishop', 'King'], answer: 2 },
    { question: 'What is the national animal of Scotland?', options: ['Sheep', 'Lion', 'Unicorn', 'Dragon'], answer: 2 },
    { question: 'How many rings are in the Olympic symbol?', options: ['4', '5', '6', '7'], answer: 1 },
    { question: 'Who is the author of "The Lord of the Rings"?', options: ['C.S. Lewis', 'J.R.R. Tolkien', 'George R.R. Martin', 'J.K. Rowling'], answer: 1 },
    { question: 'What is the largest bone in the human body?', options: ['Skull', 'Spine', 'Femur', 'Rib'], answer: 2 },
    { question: 'Which country drinks the most coffee per capita?', options: ['USA', 'Italy', 'Finland', 'Brazil'], answer: 2 },
    { question: 'What is the capital of Canada?', options: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa'], answer: 3 },
    { question: 'Which element is needed for combustion?', options: ['Helium', 'Oxygen', 'Carbon', 'Nitrogen'], answer: 1 },
    { question: 'Who was the first man on the moon?', options: ['Buzz Aldrin', 'Neil Armstrong', 'Yuri Gagarin', 'John Glenn'], answer: 1 },
    { question: 'What is the fastest aquatic animal?', options: ['Shark', 'Sailfish', 'Dolphin', 'Tuna'], answer: 1 },
    { question: 'Depending on the version, how many eyes does a Minecraft Enderman have?', options: ['2', '3', '4', '6'], answer: 0 },
    { question: 'Which Avenger is a doctor?', options: ['Iron Man', 'Captain America', 'Doctor Strange', 'Hulk'], answer: 2 },
    { question: 'What is the currency of Russia?', options: ['Euro', 'Dollar', 'Ruble', 'Yen'], answer: 2 },
    { question: 'What is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], answer: 1 },
    { question: 'Which country has the most islands?', options: ['Philippines', 'Indonesia', 'Sweden', 'Canada'], answer: 2 },
    { question: 'What does "www" stand for?', options: ['World Wide Web', 'World Web Wide', 'Wide World Web', 'Web World Wide'], answer: 0 },
    { question: 'How many keys are on a standard piano?', options: ['66', '77', '88', '99'], answer: 2 },
    { question: 'Who painted "The Last Supper"?', options: ['Michelangelo', 'Da Vinci', 'Raphael', 'Donatello'], answer: 1 },
    { question: 'Which blood type is the universal donor?', options: ['A', 'B', 'AB', 'O'], answer: 3 },
    { question: 'What is the square root of 64?', options: ['6', '7', '8', '9'], answer: 2 },
    { question: 'Which planet is known as the Morning Star?', options: ['Mars', 'Venus', 'Mercury', 'Jupiter'], answer: 1 },
    { question: 'Who wrote "Romeo and Juliet"?', options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'], answer: 1 },
    { question: 'What is the main language of Brazil?', options: ['Spanish', 'Portuguese', 'English', 'French'], answer: 1 },
    { question: 'How many sides does a heptagon have?', options: ['6', '7', '8', '9'], answer: 1 },
    { question: 'What is the hardest mineral?', options: ['Gold', 'Iron', 'Diamond', 'Quartz'], answer: 2 },
    { question: 'Which city is known as the Big Apple?', options: ['Los Angeles', 'Chicago', 'New York', 'Miami'], answer: 2 },
    { question: 'What is the most popular sport in the world?', options: ['Basketball', 'Cricket', 'Soccer', 'Tennis'], answer: 2 },
    { question: 'How many stars are on the Chinese flag?', options: ['4', '5', '6', '7'], answer: 1 },
    { question: 'Who discovered Penicillin?', options: ['Fleming', 'Pasteur', 'Curie', 'Darwin'], answer: 0 },
    { question: 'What is the largest cat species?', options: ['Lion', 'Tiger', 'Leopard', 'Jaguar'], answer: 1 },
    { question: 'Which instrument has 47 strings?', options: ['Guitar', 'Piano', 'Harp', 'Violin'], answer: 2 },
    { question: 'What is the capital of Italy?', options: ['Venice', 'Milan', 'Rome', 'Florence'], answer: 2 },
    { question: 'Which gaming console is best selling of all time?', options: ['PS2', 'DS', 'Switch', 'PS4'], answer: 0 },
    { question: 'Who is the mascot of SEGA?', options: ['Mario', 'Sonic', 'Pacman', 'Crash'], answer: 1 },
    { question: 'What is the freezing point of water in Fahrenheit?', options: ['0', '10', '32', '100'], answer: 2 },
    { question: 'Which organ produces insulin?', options: ['Liver', 'Kidney', 'Pancreas', 'Stomach'], answer: 2 },
    { question: 'What is the smallest continent?', options: ['Europe', 'Antarctica', 'Australia', 'South America'], answer: 2 },
    { question: 'Who sang "Thriller"?', options: ['Prince', 'Michael Jackson', 'Madonna', 'Queen'], answer: 1 },
    { question: 'What is the main ingredient in Hummus?', options: ['Chickpeas', 'Lentils', 'Beans', 'Peas'], answer: 0 },
    { question: 'Which year did the first iPhone launch?', options: ['2005', '2006', '2007', '2008'], answer: 2 },
];

const EIGHT_BALL_RESPONSES = [
    { text: 'It is certain.', type: 'positive' }, { text: 'Without a doubt.', type: 'positive' },
    { text: 'Yes, definitely!', type: 'positive' }, { text: 'Most likely.', type: 'positive' },
    { text: 'Outlook good.', type: 'positive' }, { text: 'Yes!', type: 'positive' },
    { text: 'Signs point to yes.', type: 'positive' },
    { text: 'Reply hazy, try again.', type: 'neutral' }, { text: 'Ask again later.', type: 'neutral' },
    { text: 'Cannot predict now.', type: 'neutral' }, { text: 'Concentrate and ask again.', type: 'neutral' },
    { text: "Don't count on it.", type: 'negative' }, { text: 'My reply is no.', type: 'negative' },
    { text: 'Outlook not so good.', type: 'negative' }, { text: 'Very doubtful.', type: 'negative' },
    // New Responses
    { text: 'My sources say no.', type: 'negative' }, { text: 'As I see it, yes.', type: 'positive' },
    { text: 'Ask your mom.', type: 'neutral' }, { text: 'I assume so.', type: 'positive' },
    { text: 'Better not tell you now.', type: 'neutral' }, { text: 'In your dreams.', type: 'negative' },
    { text: 'Yes, but be careful.', type: 'positive' }, { text: 'No way!', type: 'negative' },
    { text: 'Maybe... if you give me a cookie.', type: 'neutral' }, { text: '404 Answer Not Found.', type: 'neutral' },
];

const WOULD_YOU_RATHER = [
    ['Be able to fly', 'Be able to read minds'],
    ['Live without music', 'Live without movies'],
    ['Have unlimited money', 'Have unlimited time'],
    ['Be invisible', 'Be able to teleport'],
    ['Know every language', 'Play every instrument'],
    ['Live in the future', 'Live in the past'],
    ['Have super strength', 'Have super speed'],
    ['Never sleep again', 'Never eat again'],
    ['Be famous', 'Be the smartest person alive'],
    ['Live on the moon', 'Live underwater'],
    ['Have a pet dragon', 'Have a pet unicorn'],
    ['Be able to talk to animals', 'Speak every human language'],
    ['Have x-ray vision', 'Have night vision'],
    ['Be 10 years older', 'Be 5 years younger'],
    ['Win the lottery', 'Live twice as long'],
    // New Scenarios
    ['Always be cold', 'Always be hot'],
    ['Speak all languages', 'Speak to animals'],
    ['Be the funniest person', 'Be the most attractive person'],
    ['Give up phone for a year', 'Give up internet for a month'],
    ['Have a pause button for life', 'Have a rewind button for life'],
    ['Lose all your money', 'Lose all your memories'],
    ['Eat only pizza', 'Eat only tacos'],
    ['Live in a cave', 'Live in a treehouse'],
    ['Be famous but alone', 'Be poor but loved'],
    ['Explore space', 'Explore the ocean'],
    ['Never get angry', 'Never get sad'],
    ['Have a personal chef', 'Have a personal driver'],
    ['Change your past', 'See your future'],
    ['Be a ninja', 'Be a pirate'],
    ['Have infinite battery life', 'Have free wifi everywhere'],
    ['Always say everything on your mind', 'Never be able to speak again'],
    ['Live without TV', 'Live without social media'],
    ['Be a dragon', 'Own a dragon'],
    ['Stop time', 'Fly'],
    ['Be the villain', 'Be the sidekick'],
    // ─── MASSIVE EXPANSION: WOULD YOU RATHER ───
    ['Have a rewind button', 'Have a pause button'],
    ['Be able to talk with animals', 'Speak all foreign languages'],
    ['Win $50,000', 'Let your best friend win $500,000'],
    ['Be famous in this lifetime', 'Be famous in history books'],
    ['Find true love', 'Find a suitcase with 5 million dollars'],
    ['Never be able to go out during the day', 'Never be able to go out at night'],
    ['Have a personal maid', 'Have a personal chef'],
    ['Be able to change the past', 'Be able to see the future'],
    ['Sacrifice yourself to save 100 strangers', 'Watch 100 strangers die'],
    ['Live in a video game', 'Live in a movie'],
    ['Lose your sight', 'Lose your hearing'],
    ['Always say what you are thinking', 'Never be able to speak again'],
    ['Be covered in fur', 'Be covered in scales'],
    ['Have a flying carpet', 'Have a transparent car'],
    ['Never retain your memories', 'Never be able to make new memories'],
    ['Only be able to whisper', 'Only be able to shout'],
    ['Have fingers as long as legs', 'Have legs as long as fingers'],
    ['Eat a spider', 'Eat a cockroach'],
    ['Live in the wilderness', 'Live in a jail'],
    ['Be the smartest person', 'Be the funniest person'],
    ['Control fire', 'Control water'],
    ['Teleport anywhere', 'Read minds'],
    ['Have 3 eyes', 'Have 3 arms'],
    ['Be forced to sing every time you speak', 'Be forced to dance every time you move'],
    ['Fight 100 duck-sized horses', 'Fight 1 horse-sized duck'],
    ['Always smell like fish', 'Always smell like sewage'],
    ['Have a head the size of a tennis ball', 'Have a head the size of a watermelon'],
    ['Never use the internet again', 'Never watch TV again'],
    ['Be an unknown superhero', 'Be a famous villain'],
    ['Live without your phone', 'Live without your computer'],
];

const SCRAMBLE_WORDS = [
    { word: 'DISCORD', hint: 'A chat platform' },
    { word: 'JAVASCRIPT', hint: 'A programming language' },
    { word: 'GIVEAWAY', hint: 'Free stuff!' },
    { word: 'KEYBOARD', hint: 'You type on it' },
    { word: 'COMPUTER', hint: 'A machine for work and games' },
    { word: 'INTERNET', hint: 'Connects the world' },
    { word: 'ELEPHANT', hint: 'Largest land animal' },
    { word: 'TREASURE', hint: 'Pirates search for it' },
    { word: 'MOUNTAIN', hint: 'Very tall landform' },
    { word: 'DINOSAUR', hint: 'Extinct reptile' },
    { word: 'FOOTBALL', hint: 'Popular sport' },
    { word: 'SANDWICH', hint: 'Bread with filling' },
    { word: 'FIREWORK', hint: 'Explodes in the sky' },
    { word: 'UMBRELLA', hint: 'Keeps rain off you' },
    { word: 'BIRTHDAY', hint: 'Celebrated once a year' },
    { word: 'AIRPLANE', hint: 'Flies in the sky' },
    { word: 'MUSHROOM', hint: 'A fungus you can eat' },
    { word: 'CHAMPION', hint: 'The winner' },
    { word: 'PAINTING', hint: 'Art on canvas' },
    { word: 'LANGUAGE', hint: 'Used to communicate' },
    // New Words
    { word: 'PYTHON', hint: 'A snake or a coding language' },
    { word: 'BANANA', hint: 'Yellow curved fruit' },
    { word: 'GALAXY', hint: 'Contains solar systems' },
    { word: 'PUZZLE', hint: 'You solve it' },
    { word: 'JUNGLE', hint: 'Wild forest' },
    { word: 'GUITAR', hint: 'Musical instrument with strings' },
    { word: 'DOCTOR', hint: 'Treats sick people' },
    { word: 'SCHOOL', hint: 'Place for learning' },
    { word: 'SUMMER', hint: 'Hot season' },
    { word: 'WINTER', hint: 'Cold season' },
    { word: 'PLANET', hint: 'Orbits a star' },
    { word: 'ROCKET', hint: 'Goes to space' },
    { word: 'COFFEE', hint: 'Morning drink' },
    { word: 'CAMERA', hint: 'Takes photos' },
    { word: 'ZOMBIE', hint: 'Undead creature' },
    { word: 'PIRATE', hint: 'Sails the seas for gold' },
    { word: 'ROBOT', hint: 'Mechanical being' },
    { word: 'CASTLE', hint: 'Where kings live' },
    { word: 'DIAMOND', hint: 'Precious gem' },
    { word: 'DRAGON', hint: 'Fire breathing beast' },
    { word: 'TOMATO', hint: 'Red fruit/vegetable' },
    { word: 'ORANGE', hint: 'A color and a fruit' },
    { word: 'PURPLE', hint: 'Color of royalty' },
    { word: 'SQUARE', hint: 'Shape with 4 equal sides' },
    { word: 'CIRCLE', hint: 'Round shape' },
    { word: 'FRIEND', hint: 'Someone you like' },
    { word: 'BOTTLE', hint: 'Holds liquid' },
    { word: 'WINDOW', hint: 'You look through it' },
    { word: 'GARDEN', hint: 'Where plants grow' },
    { word: 'BRIDGE', hint: 'Connects two places' },
    // ─── MASSIVE EXPANSION: SCRAMBLE ───
    { word: 'KEYBOARD', hint: 'Input device' },
    { word: 'MONITOR', hint: 'Output display' },
    { word: 'SPEAKER', hint: 'Produces sound' },
    { word: 'HEADPHONE', hint: 'Personal audio' },
    { word: 'LAPTOP', hint: 'Portable computer' },
    { word: 'CHARGER', hint: 'Gives power' },
    { word: 'BATTERY', hint: 'Stores energy' },
    { word: 'NETWORK', hint: 'Connected computers' },
    { word: 'SERVER', hint: 'Hosts data' },
    { word: 'DATABASE', hint: 'Stores information' },
    { word: 'WEBSITE', hint: 'Pages on the internet' },
    { word: 'BROWSER', hint: 'Views websites' },
    { word: 'PROGRAM', hint: 'Set of instructions' },
    { word: 'ALGORITHM', hint: 'Step by step procedure' },
    { word: 'VARIABLE', hint: 'Stores a value' },
    { word: 'FUNCTION', hint: 'Reusable code block' },
    { word: 'ARRAY', hint: 'List of items' },
    { word: 'OBJECT', hint: 'Key value pairs' },
    { word: 'STRING', hint: 'Text data type' },
    { word: 'BOOLEAN', hint: 'True or False' },
    { word: 'INTEGER', hint: 'Whole number' },
    { word: 'FLOAT', hint: 'Decimal number' },
    { word: 'SYNTAX', hint: 'Grammar of code' },
    { word: 'ERROR', hint: 'Something went wrong' },
    { word: 'DEBUG', hint: 'Fixing errors' },
    { word: 'COMPILE', hint: 'Build code' },
    { word: 'RUNTIME', hint: 'When code executes' },
    { word: 'MEMORY', hint: 'RAM' },
    { word: 'STORAGE', hint: 'Hard drive' },
    { word: 'LINUX', hint: 'Open source OS' },
    { word: 'WINDOWS', hint: 'Microsoft OS' },
    { word: 'APPLE', hint: 'Tech giant or fruit' },
    { word: 'ANDROID', hint: 'Mobile OS' },
    { word: 'ROUTER', hint: 'Directs traffic' },
    { word: 'SWITCH', hint: 'Network device or console' },
    { word: 'MODEM', hint: 'Connects to ISP' },
    { word: 'WIFI', hint: 'Violent connection... wait no' },
    { word: 'BLUETOOTH', hint: 'Wireless short range' },
    { word: 'ETHERNET', hint: 'Wired connection' },
    { word: 'FIREWALL', hint: 'Network security' },
    { word: 'VIRUS', hint: 'Malware' },
    { word: 'HACKER', hint: 'Breaks into systems' },
    { word: 'PASSWORD', hint: 'Secret key' },
    { word: 'ENCRYPTION', hint: 'Scrambles data perfectly' },
    { word: 'BITCOIN', hint: 'Crypto currency' },
    { word: 'BLOCKCHAIN', hint: 'Chain of blocks' },
    { word: 'ROBOTICS', hint: 'Building robots' },
    { word: 'AUTOMATION', hint: 'Self operating' },
    { word: 'ARTIFICIAL', hint: 'Not natural' },
    { word: 'INTELLIGENCE', hint: 'Smarts' },
];

const EMOJI_QUIZ = [
    { emojis: '🦁👑', answer: 'The Lion King' },
    { emojis: '⚡🧙‍♂️👓', answer: 'Harry Potter' },
    { emojis: '🦇👨', answer: 'Batman' },
    { emojis: '🕸️🕷️👨', answer: 'Spider-Man' },
    { emojis: '🚢🧊💔', answer: 'Titanic' },
    { emojis: '🦖🦕🏞️', answer: 'Jurassic Park' },
    { emojis: '👽🚲🌕', answer: 'E.T.' },
    { emojis: '👻🚫👨‍🚒', answer: 'Ghostbusters' },
    { emojis: '🔍🐠', answer: 'Finding Nemo' },
    { emojis: '🐼🥋', answer: 'Kung Fu Panda' },
    { emojis: '🍎👸🏰', answer: 'Snow White' },
    { emojis: '🧞‍♂️✨🐒', answer: 'Aladdin' },
    { emojis: '🚀🌌⚔️', answer: 'Star Wars' },
    { emojis: '💍🌋👣', answer: 'Lord of the Rings' },
    { emojis: '🏴‍☠️🦜🚢', answer: 'Pirates of the Caribbean' },
    { emojis: '🤠🧸🚀', answer: 'Toy Story' },
    { emojis: '🍫🏭🎫', answer: 'Charlie and the Chocolate Factory' },
    { emojis: '🤡🎈😱', answer: 'It' },
    { emojis: '🐀👨‍🍳🍲', answer: 'Ratatouille' },
    { emojis: '🧠💭😄', answer: 'Inside Out' }
];

const CARD_SUITS = ['♠️', '♥️', '♦️', '♣️'];
const CARD_VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// ═══════════════════════════════════════════════════════════════════
// Slash Command Definition
// ═══════════════════════════════════════════════════════════════════

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fun')
        .setDescription('Fun mini-games and activities!')

        .addSubcommand(sub => sub.setName('coinflip').setDescription('Flip a coin!')
            .addStringOption(opt => opt.setName('call').setDescription('Call heads or tails').addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' }))
            .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet (optional)').setMinValue(1)))

        .addSubcommand(sub => sub.setName('dice').setDescription('Roll dice!')
            .addIntegerOption(opt => opt.setName('sides').setDescription('Number of sides (default: 6)').setMinValue(2).setMaxValue(100))
            .addIntegerOption(opt => opt.setName('count').setDescription('Number of dice (default: 1)').setMinValue(1).setMaxValue(10)))

        .addSubcommand(sub => sub.setName('8ball').setDescription('Ask the Magic 8-Ball')
            .addStringOption(opt => opt.setName('question').setDescription('Your question').setRequired(true)))

        .addSubcommand(sub => sub.setName('rps').setDescription('Rock Paper Scissors!')
            .addStringOption(opt => opt.setName('choice').setDescription('Your move').setRequired(true)
                .addChoices({ name: '🪨 Rock', value: 'rock' }, { name: '📄 Paper', value: 'paper' }, { name: '✂️ Scissors', value: 'scissors' })))

        .addSubcommand(sub => sub.setName('trivia').setDescription('Answer a trivia question!'))

        .addSubcommand(sub => sub.setName('guess').setDescription('Guess the number (1-100)!'))

        .addSubcommand(sub => sub.setName('wyr').setDescription('Would You Rather?'))

        .addSubcommand(sub => sub.setName('scramble').setDescription('Unscramble the word!'))

        .addSubcommand(sub => sub.setName('blackjack').setDescription('Play Blackjack against the dealer!')
            .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet (optional)').setMinValue(1)))

        .addSubcommand(sub => sub.setName('tictactoe').setDescription('Play Tic-Tac-Toe!')
            .addUserOption(opt => opt.setName('opponent').setDescription('Who to play against (leave empty to play vs bot)')))

        .addSubcommand(sub => sub.setName('slots').setDescription('Spin the slot machine!')
            .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet (optional)').setMinValue(1)))

        .addSubcommand(sub => sub.setName('reaction').setDescription('Test your reaction speed!'))

        .addSubcommand(sub => sub.setName('wordchain').setDescription('Word chain — connect the last letter!'))

        .addSubcommand(sub => sub.setName('minesweeper').setDescription('Play Minesweeper!'))
        .addSubcommand(sub => sub.setName('emojiquiz').setDescription('Guess the phrase from emojis!'))

        .addSubcommand(sub => sub.setName('cardbattle')
            .setDescription('High Card multiplayer battle!')
            .addIntegerOption(opt => opt.setName('bet').setDescription('Amount to bet').setMinValue(10)))

        .addSubcommand(sub => sub.setName('hangman').setDescription('Play Hangman!'))

        .addSubcommand(sub => sub.setName('math').setDescription('Solve a math problem for coins!')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        switch (sub) {
            case 'coinflip': return handleCoinflip(interaction);
            case 'dice': return handleDice(interaction);
            case '8ball': return handle8Ball(interaction);
            case 'rps': return handleRPS(interaction);
            case 'trivia': return handleTrivia(interaction);
            case 'guess': return handleGuess(interaction);
            case 'wyr': return handleWYR(interaction);
            case 'scramble': return handleScramble(interaction);
            case 'blackjack': return handleBlackjack(interaction);
            case 'tictactoe': return handleTicTacToe(interaction);
            case 'slots': return handleSlots(interaction);
            case 'reaction': return handleReaction(interaction);
            case 'wordchain': return handleWordChain(interaction);
            case 'minesweeper': return handleMinesweeper(interaction);
            case 'emojiquiz': return handleEmojiQuiz(interaction);
            case 'cardbattle': return handleCardBattle(interaction);
            case 'hangman': return handleHangman(interaction);
            case 'math': return handleMath(interaction);
        }
    },
};

// ═══════════════════════════════════════════════════════════════════
// Game Handlers
// ═══════════════════════════════════════════════════════════════════

// ─── Coinflip ────────────────────────────────────────────────────

async function handleCoinflip(interaction) {
    const call = interaction.options.getString('call');
    const bet = interaction.options.getInteger('bet');
    const user = db.getUser(interaction.user.id);

    if (bet && user.balance < bet) {
        return interaction.reply({ content: `❌ You don't have enough money! Balance: **${user.balance}**`, ephemeral: true });
    }

    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const emoji = result === 'heads' ? '🪙' : '💿';

    const embed = new EmbedBuilder().setTitle(`${emoji}  Coin Flip!`).setColor(0xF1C40F).setTimestamp();

    if (call) {
        const won = call === result;
        if (bet) {
            if (won) {
                db.addBalance(user.id, bet);
                embed.setDescription(`The coin landed on **${result.toUpperCase()}**!\n\nYou called **${call}** — 🎉 **You win ${bet * 2} coins!** 💰`);
            } else {
                db.removeBalance(user.id, bet);
                embed.setDescription(`The coin landed on **${result.toUpperCase()}**!\n\nYou called **${call}** — 😔 **You lost ${bet} coins.** 💸`);
            }
        } else {
            embed.setDescription(`The coin landed on **${result.toUpperCase()}**!\n\nYou called **${call}** — ${won ? '🎉 **You win!**' : '😔 **You lose!**'}`);
        }
    } else {
        embed.setDescription(`The coin landed on **${result.toUpperCase()}**! ${emoji}`);
    }
    return interaction.reply({ embeds: [embed] });
}

// ─── Dice ────────────────────────────────────────────────────────

async function handleDice(interaction) {
    const sides = interaction.options.getInteger('sides') || 6;
    const count = interaction.options.getInteger('count') || 1;
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0);

    const embed = new EmbedBuilder().setTitle('🎲  Dice Roll!').setColor(0xE74C3C).setTimestamp();
    if (count === 1) {
        embed.setDescription(`You rolled a **${rolls[0]}**! (d${sides})`);
    } else {
        embed.setDescription(`Rolling **${count}d${sides}**...\n\n🎯 Results: ${rolls.map(r => `\`${r}\``).join(' + ')}\n📊 **Total: ${total}**`);
    }
    return interaction.reply({ embeds: [embed] });
}

// ─── 8-Ball ──────────────────────────────────────────────────────

async function handle8Ball(interaction) {
    const question = interaction.options.getString('question');
    const response = EIGHT_BALL_RESPONSES[Math.floor(Math.random() * EIGHT_BALL_RESPONSES.length)];
    const colorMap = { positive: 0x2ECC71, neutral: 0xF39C12, negative: 0xE74C3C };

    const embed = new EmbedBuilder()
        .setTitle('🎱  Magic 8-Ball')
        .setDescription(`**Question:** ${question}\n\n**Answer:** ${response.text}`)
        .setColor(colorMap[response.type]).setTimestamp();
    return interaction.reply({ embeds: [embed] });
}

// ─── Rock Paper Scissors ─────────────────────────────────────────

async function handleRPS(interaction) {
    const userChoice = interaction.options.getString('choice');
    const choices = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * 3)];
    const emojiMap = { rock: '🪨', paper: '📄', scissors: '✂️' };

    let result, color;
    if (userChoice === botChoice) { result = "🤝 It's a tie!"; color = 0xF39C12; }
    else if ((userChoice === 'rock' && botChoice === 'scissors') || (userChoice === 'paper' && botChoice === 'rock') || (userChoice === 'scissors' && botChoice === 'paper')) { result = '🎉 You win!'; color = 0x2ECC71; }
    else { result = '😔 You lose!'; color = 0xE74C3C; }

    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    const embed = new EmbedBuilder()
        .setTitle('⚔️  Rock Paper Scissors')
        .setDescription(`You chose ${emojiMap[userChoice]} **${cap(userChoice)}**\nI chose ${emojiMap[botChoice]} **${cap(botChoice)}**\n\n**${result}**`)
        .setColor(color).setTimestamp();
    return interaction.reply({ embeds: [embed] });
}

// ─── Trivia ──────────────────────────────────────────────────────

async function handleTrivia(interaction) {
    const q = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
    const labels = ['A', 'B', 'C', 'D'];

    const embed = new EmbedBuilder()
        .setTitle('🧠  Trivia Time!')
        .setDescription([`**${q.question}**`, '', ...q.options.map((opt, i) => `${labels[i]}. ${opt}`), '', '⏰ **15 seconds** to answer!'].join('\n'))
        .setColor(0x3498DB).setTimestamp();

    const uid = Date.now().toString(36);
    const row = new ActionRowBuilder().addComponents(
        ...q.options.map((_, i) => new ButtonBuilder().setCustomId(`trivia_${i}_${uid}`).setLabel(labels[i]).setStyle(ButtonStyle.Secondary))
    );

    const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    try {
        const collected = await reply.awaitMessageComponent({ filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith(`trivia_`) && i.customId.endsWith(uid), time: 15_000 });
        const chosen = parseInt(collected.customId.split('_')[1]);
        const correct = chosen === q.answer;

        const disabledRow = new ActionRowBuilder().addComponents(
            ...q.options.map((_, i) => new ButtonBuilder().setCustomId(`trivia_${i}_${uid}`).setLabel(labels[i])
                .setStyle(i === q.answer ? ButtonStyle.Success : (i === chosen && !correct ? ButtonStyle.Danger : ButtonStyle.Secondary)).setDisabled(true))
        );

        const resultEmbed = new EmbedBuilder()
            .setTitle(correct ? '✅  Correct!' : '❌  Wrong!')
            .setDescription([`**${q.question}**`, '', ...q.options.map((opt, i) => `${i === q.answer ? '✅' : (i === chosen && !correct ? '❌' : '  ')} ${labels[i]}. ${opt}`), '', correct ? `🎉 Great job!` : `The answer was **${labels[q.answer]}. ${q.options[q.answer]}**`].join('\n'))
            .setColor(correct ? 0x2ECC71 : 0xE74C3C).setTimestamp();

        await collected.update({ embeds: [resultEmbed], components: [disabledRow] });
    } catch {
        const disabledRow = new ActionRowBuilder().addComponents(
            ...q.options.map((_, i) => new ButtonBuilder().setCustomId(`trivia_${i}_${uid}`).setLabel(labels[i]).setStyle(i === q.answer ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(true))
        );
        await reply.edit({ embeds: [new EmbedBuilder().setTitle("⏰  Time's Up!").setDescription(`The answer was **${labels[q.answer]}. ${q.options[q.answer]}**`).setColor(0x95A5A6)], components: [disabledRow] }).catch(() => { });
    }
}

// ─── Number Guessing ─────────────────────────────────────────────

async function handleGuess(interaction) {
    const target = Math.floor(Math.random() * 100) + 1;
    let attempts = 0;
    const maxAttempts = 7;

    const embed = new EmbedBuilder()
        .setTitle('🔢  Number Guessing Game')
        .setDescription(`I'm thinking of a number between **1** and **100**.\n\n🎯 You have **${maxAttempts} attempts**.\nType your guess in chat!`)
        .setColor(0x3498DB).setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const filter = (m) => m.author.id === interaction.user.id && !isNaN(m.content) && parseInt(m.content) >= 1 && parseInt(m.content) <= 100;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60_000, max: maxAttempts });

    collector.on('collect', (msg) => {
        attempts++;
        const guess = parseInt(msg.content);

        if (guess === target) {
            const winEmbed = new EmbedBuilder()
                .setTitle('🎉  You Got It!')
                .setDescription(`The number was **${target}**!\n\n🏆 You guessed it in **${attempts}** attempt${attempts !== 1 ? 's' : ''}!`)
                .setColor(0x2ECC71).setTimestamp();
            msg.reply({ embeds: [winEmbed] });
            collector.stop('won');
        } else if (attempts >= maxAttempts) {
            const loseEmbed = new EmbedBuilder()
                .setTitle('💀  Game Over!')
                .setDescription(`The number was **${target}**.\n\nYou used all **${maxAttempts}** attempts.`)
                .setColor(0xE74C3C).setTimestamp();
            msg.reply({ embeds: [loseEmbed] });
            collector.stop('lost');
        } else {
            const hint = guess > target ? '📉 **Lower!**' : '📈 **Higher!**';
            const remaining = maxAttempts - attempts;
            msg.reply(`${hint} (${remaining} attempt${remaining !== 1 ? 's' : ''} left)`);
        }
    });

    collector.on('end', (_, reason) => {
        if (reason === 'time') {
            interaction.followUp({ embeds: [new EmbedBuilder().setTitle('⏰  Time\'s Up!').setDescription(`The number was **${target}**.`).setColor(0x95A5A6)] });
        }
    });
}

// ─── Would You Rather ────────────────────────────────────────────

async function handleWYR(interaction) {
    const wyr = WOULD_YOU_RATHER[Math.floor(Math.random() * WOULD_YOU_RATHER.length)];
    const uid = Date.now().toString(36);

    const embed = new EmbedBuilder()
        .setTitle('🤔  Would You Rather?')
        .setDescription(`**🅰️** ${wyr[0]}\n\n**OR**\n\n**🅱️** ${wyr[1]}`)
        .setColor(0x9B59B6).setFooter({ text: 'Vote by clicking a button!' }).setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`wyr_a_${uid}`).setLabel('A').setEmoji('🅰️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`wyr_b_${uid}`).setLabel('B').setEmoji('🅱️').setStyle(ButtonStyle.Danger),
    );

    const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    const votes = { a: 0, b: 0 };
    const voters = new Set();

    const collector = reply.createMessageComponentCollector({ filter: (i) => i.customId.endsWith(uid), time: 30_000 });

    collector.on('collect', async (i) => {
        if (voters.has(i.user.id)) {
            return i.reply({ content: "You've already voted!", ephemeral: true });
        }
        voters.add(i.user.id);
        const choice = i.customId.startsWith('wyr_a') ? 'a' : 'b';
        votes[choice]++;
        await i.reply({ content: `✅ You chose **${choice === 'a' ? 'A' : 'B'}**!`, ephemeral: true });
    });

    collector.on('end', async () => {
        const total = votes.a + votes.b;
        const pctA = total > 0 ? Math.round((votes.a / total) * 100) : 0;
        const pctB = total > 0 ? Math.round((votes.b / total) * 100) : 0;

        const resultEmbed = new EmbedBuilder()
            .setTitle('🤔  Would You Rather — Results')
            .setDescription(`**🅰️** ${wyr[0]} — **${pctA}%** (${votes.a} votes)\n\n**🅱️** ${wyr[1]} — **${pctB}%** (${votes.b} votes)\n\n📊 Total votes: **${total}**`)
            .setColor(0x9B59B6).setTimestamp();

        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`wyr_a_${uid}`).setLabel(`A (${votes.a})`).setEmoji('🅰️').setStyle(ButtonStyle.Primary).setDisabled(true),
            new ButtonBuilder().setCustomId(`wyr_b_${uid}`).setLabel(`B (${votes.b})`).setEmoji('🅱️').setStyle(ButtonStyle.Danger).setDisabled(true),
        );

        await reply.edit({ embeds: [resultEmbed], components: [disabledRow] }).catch(() => { });
    });
}

// ─── Word Scramble ───────────────────────────────────────────────

async function handleScramble(interaction) {
    const wordData = SCRAMBLE_WORDS[Math.floor(Math.random() * SCRAMBLE_WORDS.length)];
    const scrambled = wordData.word.split('').sort(() => Math.random() - 0.5).join('');

    const embed = new EmbedBuilder()
        .setTitle('🔤  Word Scramble!')
        .setDescription(`Unscramble this word:\n\n## \`${scrambled}\`\n\n💡 Hint: *${wordData.hint}*\n\n⏰ You have **30 seconds**! Type your answer.`)
        .setColor(0xE67E22).setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const filter = (m) => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30_000 });

    collector.on('collect', (msg) => {
        if (msg.content.toUpperCase() === wordData.word) {
            msg.reply({ embeds: [new EmbedBuilder().setTitle('🎉  Correct!').setDescription(`The word was **${wordData.word}**! Great job!`).setColor(0x2ECC71)] });
            collector.stop('won');
        } else {
            msg.reply('❌ Not quite! Try again...').catch(() => { });
        }
    });

    collector.on('end', (_, reason) => {
        if (reason === 'time') {
            interaction.followUp({ embeds: [new EmbedBuilder().setTitle("⏰  Time's Up!").setDescription(`The word was **${wordData.word}**.`).setColor(0x95A5A6)] });
        }
    });
}

// ─── Blackjack ───────────────────────────────────────────────────

function drawCard() {
    const suit = CARD_SUITS[Math.floor(Math.random() * 4)];
    const value = CARD_VALUES[Math.floor(Math.random() * 13)];
    return { suit, value, display: `${value}${suit}` };
}

function handValue(hand) {
    let total = 0, aces = 0;
    for (const card of hand) {
        if (card.value === 'A') { total += 11; aces++; }
        else if (['K', 'Q', 'J'].includes(card.value)) total += 10;
        else total += parseInt(card.value);
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}

function handString(hand) { return hand.map(c => `\`${c.display}\``).join(' '); }

async function handleBlackjack(interaction) {
    const playerHand = [drawCard(), drawCard()];
    const dealerHand = [drawCard(), drawCard()];
    const uid = Date.now().toString(36);

    function buildEmbed(showDealer = false) {
        const playerVal = handValue(playerHand);
        const dealerVal = showDealer ? handValue(dealerHand) : '?';
        const dealerCards = showDealer ? handString(dealerHand) : `${dealerHand[0].display} \`??\``;

        return new EmbedBuilder()
            .setTitle('🃏  Blackjack')
            .setDescription([
                `**Dealer's Hand** (${dealerVal})`, dealerCards, '',
                `**Your Hand** (${playerVal})`, handString(playerHand),
            ].join('\n'))
            .setColor(playerVal > 21 ? 0xE74C3C : 0x2ECC71).setTimestamp();
    }

    // Check for natural blackjack
    if (handValue(playerHand) === 21) {
        const winAmount = Math.ceil(bet * 1.5);
        if (bet) db.addBalance(interaction.user.id, winAmount); // Natural pays 3:2 usually, or just 2.5x total
        const embed = buildEmbed(true).setTitle('🃏  Blackjack — 🎉 BLACKJACK!').setDescription(buildEmbed(true).data.description + `\n\n🏆 **Natural Blackjack! You win${bet ? ` ${winAmount + bet} coins` : ''}!**`);
        return interaction.reply({ embeds: [embed] });
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`bj_hit_${uid}`).setLabel('Hit').setEmoji('🃏').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bj_stand_${uid}`).setLabel('Stand').setEmoji('🛑').setStyle(ButtonStyle.Danger),
    );

    const reply = await interaction.reply({ embeds: [buildEmbed()], components: [row], fetchReply: true });

    const collector = reply.createMessageComponentCollector({ filter: (i) => i.user.id === interaction.user.id && i.customId.endsWith(uid), time: 60_000 });

    collector.on('collect', async (i) => {
        if (i.customId.startsWith('bj_hit')) {
            playerHand.push(drawCard());
            if (handValue(playerHand) > 21) {
                const bustEmbed = buildEmbed(true).setTitle('🃏  Blackjack — 💥 BUST!').setColor(0xE74C3C);
                bustEmbed.setDescription(bustEmbed.data.description + '\n\n💥 **Bust! You went over 21. Dealer wins!**');
                await i.update({ embeds: [bustEmbed], components: [] });
                collector.stop();
            } else if (handValue(playerHand) === 21) {
                // Auto-stand at 21
                collector.stop('stand');
                await finishBlackjack(i, playerHand, dealerHand, uid, buildEmbed);
            } else {
                await i.update({ embeds: [buildEmbed()], components: [row] });
            }
        } else if (i.customId.startsWith('bj_stand')) {
            collector.stop('stand');
            await finishBlackjack(i, playerHand, dealerHand, uid, buildEmbed);
        }
    });

    collector.on('end', (_, reason) => {
        if (reason === 'time') {
            reply.edit({ embeds: [buildEmbed(true).setTitle('🃏  Blackjack — ⏰ Timed Out')], components: [] }).catch(() => { });
        }
    });
}

async function finishBlackjack(i, playerHand, dealerHand, uid, buildEmbed, bet) {
    // Dealer draws until 17
    while (handValue(dealerHand) < 17) dealerHand.push(drawCard());

    const playerVal = handValue(playerHand);
    const dealerVal = handValue(dealerHand);

    let result, color, payout = 0;
    if (dealerVal > 21) {
        result = `🎉 **Dealer busts! You win${bet ? ` ${bet} coins` : ''}!**`;
        color = 0x2ECC71;
        payout = bet ? bet * 2 : 0;
    }
    else if (playerVal > dealerVal) {
        result = `🎉 **You win${bet ? ` ${bet} coins` : ''}!**`;
        color = 0x2ECC71;
        payout = bet ? bet * 2 : 0;
    }
    else if (playerVal < dealerVal) {
        result = `😔 **Dealer wins${bet ? ` ${bet} coins` : ''}!**`;
        color = 0xE74C3C;
    }
    else {
        result = `🤝 **It's a push (tie)!**${bet ? ' Bet refunded.' : ''}`;
        color = 0xF39C12;
        payout = bet ? bet : 0;
    }

    if (payout > 0) db.addBalance(i.user.id, payout);

    const finalEmbed = buildEmbed(true);
    finalEmbed.setDescription(finalEmbed.data.description + `\n\n${result}`).setColor(color);
    await i.update({ embeds: [finalEmbed], components: [] });
}

// ─── Tic-Tac-Toe ─────────────────────────────────────────────────

async function handleTicTacToe(interaction) {
    const opponent = interaction.options.getUser('opponent');
    const isBot = !opponent || opponent.id === interaction.user.id || opponent.bot;
    const playerX = interaction.user;
    const playerO = isBot ? interaction.client.user : opponent;
    const uid = Date.now().toString(36);

    const board = Array(9).fill(null); // null, 'X', 'O'
    let currentTurn = 'X'; // X goes first

    function buildBoard() {
        const emojis = { X: '❌', O: '⭕', null: '⬛' };
        const rows = [];
        for (let r = 0; r < 3; r++) {
            const row = new ActionRowBuilder();
            for (let c = 0; c < 3; c++) {
                const idx = r * 3 + c;
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ttt_${idx}_${uid}`)
                        .setLabel(board[idx] ? ' ' : `${idx + 1}`)
                        .setEmoji(board[idx] ? emojis[board[idx]] : undefined)
                        .setStyle(board[idx] === 'X' ? ButtonStyle.Danger : board[idx] === 'O' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(board[idx] !== null)
                );
            }
            rows.push(row);
        }
        return rows;
    }

    function checkWinner() {
        const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
        for (const [a, b, c] of lines) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
        }
        return board.every(cell => cell !== null) ? 'draw' : null;
    }

    function botMove() {
        // Simple AI: try center, then corners, then edges
        const empty = board.map((v, i) => v === null ? i : -1).filter(i => i >= 0);
        if (empty.includes(4)) return 4;
        const corners = [0, 2, 6, 8].filter(i => empty.includes(i));
        if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
        return empty[Math.floor(Math.random() * empty.length)];
    }

    const turnPlayer = () => currentTurn === 'X' ? playerX : playerO;

    const embed = new EmbedBuilder()
        .setTitle('❌⭕  Tic-Tac-Toe')
        .setDescription(`**❌ ${playerX.username}** vs **⭕ ${playerO.username}**\n\nIt's ${turnPlayer().username}'s turn! (${currentTurn === 'X' ? '❌' : '⭕'})`)
        .setColor(0x3498DB).setTimestamp();

    const reply = await interaction.reply({ embeds: [embed], components: buildBoard(), fetchReply: true });

    const collector = reply.createMessageComponentCollector({
        filter: (i) => i.customId.endsWith(uid) && (i.user.id === playerX.id || (!isBot && i.user.id === playerO.id)),
        time: 120_000,
    });

    collector.on('collect', async (i) => {
        // Check it's the right player's turn
        if ((currentTurn === 'X' && i.user.id !== playerX.id) || (currentTurn === 'O' && i.user.id !== playerO.id)) {
            return i.reply({ content: "It's not your turn!", ephemeral: true });
        }

        const idx = parseInt(i.customId.split('_')[1]);
        if (board[idx] !== null) return i.reply({ content: 'That spot is taken!', ephemeral: true });

        board[idx] = currentTurn;
        let winner = checkWinner();

        if (!winner && isBot && currentTurn === 'X') {
            currentTurn = 'O';
            const botIdx = botMove();
            board[botIdx] = 'O';
            winner = checkWinner();
            currentTurn = 'X';
        } else {
            currentTurn = currentTurn === 'X' ? 'O' : 'X';
        }

        if (winner) {
            let resultText;
            if (winner === 'draw') resultText = "🤝 **It's a draw!**";
            else resultText = `🏆 **${winner === 'X' ? playerX.username : playerO.username} wins!** (${winner === 'X' ? '❌' : '⭕'})`;

            const finalEmbed = new EmbedBuilder()
                .setTitle('❌⭕  Tic-Tac-Toe — Game Over')
                .setDescription(`**❌ ${playerX.username}** vs **⭕ ${playerO.username}**\n\n${resultText}`)
                .setColor(winner === 'draw' ? 0xF39C12 : 0x2ECC71).setTimestamp();

            // Disable all buttons
            const disabledBoard = buildBoard().map(row => {
                row.components.forEach(btn => btn.setDisabled(true));
                return row;
            });

            await i.update({ embeds: [finalEmbed], components: disabledBoard });
            collector.stop();
        } else {
            const turnEmbed = new EmbedBuilder()
                .setTitle('❌⭕  Tic-Tac-Toe')
                .setDescription(`**❌ ${playerX.username}** vs **⭕ ${playerO.username}**\n\nIt's ${turnPlayer().username}'s turn! (${currentTurn === 'X' ? '❌' : '⭕'})`)
                .setColor(0x3498DB).setTimestamp();

            await i.update({ embeds: [turnEmbed], components: buildBoard() });
        }
    });

    collector.on('end', (_, reason) => {
        if (reason === 'time') {
            reply.edit({ embeds: [new EmbedBuilder().setTitle('❌⭕  Tic-Tac-Toe — ⏰ Timed Out').setColor(0x95A5A6)], components: [] }).catch(() => { });
        }
    });
}

// ─── Slots ───────────────────────────────────────────────────────

async function handleSlots(interaction) {
    const bet = interaction.options.getInteger('bet');
    const user = db.getUser(interaction.user.id);
    if (bet) {
        if (user.balance < bet) return interaction.reply({ content: `❌ Not enough money! Balance: **${user.balance}**`, ephemeral: true });
        db.removeBalance(user.id, bet);
    }

    const symbols = ['🍒', '🍋', '🍊', '🍉', '⭐', '💎', '7️⃣'];
    const weights = [25, 20, 18, 15, 12, 7, 3]; // rarer = less weight
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    function weightedRandom() {
        let rand = Math.random() * totalWeight;
        for (let i = 0; i < symbols.length; i++) {
            rand -= weights[i];
            if (rand <= 0) return symbols[i];
        }
        return symbols[0];
    }

    const r1 = [weightedRandom(), weightedRandom(), weightedRandom()];
    const r2 = [weightedRandom(), weightedRandom(), weightedRandom()];
    const r3 = [weightedRandom(), weightedRandom(), weightedRandom()];

    // Check middle row (main payline)
    const allMatch = r2[0] === r2[1] && r2[1] === r2[2];
    const twoMatch = r2[0] === r2[1] || r2[1] === r2[2] || r2[0] === r2[2];

    const multiplierMap = { '7️⃣': 100, '💎': 50, '⭐': 25, '🍉': 10, '🍊': 5, '🍋': 3, '🍒': 2 };

    let result, color;
    let payout = 0;
    if (allMatch) {
        const mult = multiplierMap[r2[0]];
        result = `🎰 **JACKPOT! THREE ${r2[0]}!**`;
        payout = bet ? bet * mult : 0;
        color = r2[0] === '7️⃣' ? 0xFFD700 : 0x2ECC71;
    } else if (twoMatch) {
        const mult = 1.5;
        result = '🎰 **Two matching!** Small win!';
        payout = bet ? Math.floor(bet * mult) : 0;
        color = 0xF39C12;
    } else {
        result = '🎰 No match. Try again!';
        color = 0x95A5A6;
    }

    if (payout > 0) {
        db.addBalance(user.id, payout);
        result += `\n💰 **Won ${payout} coins!**`;
    } else if (bet) {
        result += `\n💸 **Lost ${bet} coins.**`;
    }

    const slotDisplay = [
        '┌──────────────┐',
        `│ ${r1.join(' │ ')} │`,
        '├──────────────┤',
        `│ ${r2.join(' │ ')} │ ◀`,
        '├──────────────┤',
        `│ ${r3.join(' │ ')} │`,
        '└──────────────┘',
    ].join('\n');

    const embed = new EmbedBuilder()
        .setTitle('🎰  Slot Machine')
        .setDescription(`${slotDisplay}\n\n${result}`)
        .setColor(color).setTimestamp();

    return interaction.reply({ embeds: [embed] });
}

// ─── Reaction Speed Test ─────────────────────────────────────────

async function handleReaction(interaction) {
    const uid = Date.now().toString(36);
    const waitTime = Math.floor(Math.random() * 4000) + 2000; // 2-6 seconds

    const waitEmbed = new EmbedBuilder()
        .setTitle('⚡  Reaction Speed Test')
        .setDescription('🔴 Wait for it...\n\nClick the button as soon as it turns **green**!')
        .setColor(0xE74C3C).setTimestamp();

    const waitRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`react_wait_${uid}`).setLabel('Wait...').setStyle(ButtonStyle.Danger).setDisabled(true)
    );

    const reply = await interaction.reply({ embeds: [waitEmbed], components: [waitRow], fetchReply: true });

    // Check if someone clicked too early (shouldn't be possible since disabled, but just in case)
    await new Promise(resolve => setTimeout(resolve, waitTime));

    const goEmbed = new EmbedBuilder()
        .setTitle('⚡  Reaction Speed Test')
        .setDescription('🟢 **NOW! CLICK IT!**')
        .setColor(0x2ECC71).setTimestamp();

    const goRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`react_go_${uid}`).setLabel('CLICK!').setEmoji('⚡').setStyle(ButtonStyle.Success)
    );

    const goTime = Date.now();
    await reply.edit({ embeds: [goEmbed], components: [goRow] });

    try {
        const collected = await reply.awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id && i.customId === `react_go_${uid}`,
            time: 10_000,
        });

        const reactionTime = Date.now() - goTime;
        let rating;
        if (reactionTime < 200) rating = '🏆 **INSANE!** Are you a robot?!';
        else if (reactionTime < 350) rating = '⚡ **Lightning fast!**';
        else if (reactionTime < 500) rating = '🔥 **Very fast!**';
        else if (reactionTime < 700) rating = '👍 **Pretty good!**';
        else if (reactionTime < 1000) rating = '😐 **Average**';
        else rating = '🐢 **A bit slow...**';

        const resultEmbed = new EmbedBuilder()
            .setTitle('⚡  Reaction Speed Test — Result')
            .setDescription(`⏱️ Your reaction time: **${reactionTime}ms**\n\n${rating}`)
            .setColor(reactionTime < 500 ? 0x2ECC71 : reactionTime < 1000 ? 0xF39C12 : 0xE74C3C).setTimestamp();

        await collected.update({ embeds: [resultEmbed], components: [] });
    } catch {
        await reply.edit({ embeds: [new EmbedBuilder().setTitle('⏰  Too Slow!').setDescription('You didn\'t click in time.').setColor(0x95A5A6)], components: [] }).catch(() => { });
    }
}

// ─── Word Chain ──────────────────────────────────────────────────

async function handleWordChain(interaction) {
    const chain = [];
    let lastLetter = null;
    let lastUserId = null;
    const usedWords = new Set();
    const players = new Set();
    let wordCount = 0;

    const embed = new EmbedBuilder()
        .setTitle('🔗  Word Chain!')
        .setDescription([
            '**Rules:**',
            '• Type a word that starts with the **last letter** of the previous word',
            '• No repeated words • Min 2 letters',
            '• No same user twice in a row • Anyone can play!',
            '', '🟢 **Type any word to start!**',
        ].join('\n'))
        .setColor(0x3498DB).setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const filter = (m) => !m.author.bot && /^[a-zA-Z]{2,}$/.test(m.content.trim());
    const collector = interaction.channel.createMessageCollector({ filter });

    collector.on('collect', (msg) => {
        const word = msg.content.trim().toLowerCase();
        if (lastLetter && word[0] !== lastLetter) { msg.reply(`❌ Must start with **${lastLetter.toUpperCase()}**!`); return; }
        if (usedWords.has(word)) { msg.reply('❌ Already used!'); return; }
        if (lastUserId && msg.author.id === lastUserId) { msg.reply('❌ You can\'t go twice in a row! Let someone else answer.'); return; }

        usedWords.add(word);
        lastLetter = word[word.length - 1];
        lastUserId = msg.author.id;
        wordCount++;
        players.add(msg.author.id);
        chain.push({ word, user: msg.author.username });
        msg.react('✅').catch(() => { });
        collector.resetTimer({ idle: 15_000 });

        if (wordCount % 5 === 0) {
            const last5 = chain.slice(-5).map(c => `**${c.word}** (${c.user})`).join(' → ');
            msg.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle(`🔗 Chain: ${wordCount} words!`)
                    .setDescription(`${last5}\n\nNext letter: **${lastLetter.toUpperCase()}**`)
                    .setColor(0x2ECC71).setFooter({ text: '15s to answer!' })]
            });
        }
    });

    collector.on('end', () => {
        const lastWords = chain.slice(-10).map(c => `**${c.word}**`).join(' → ');
        const rating = wordCount >= 20 ? '🏆 **Amazing!**' : wordCount >= 10 ? '🔥 **Great!**' : wordCount >= 5 ? '👍 **Not bad!**' : '💪 **Try again!**';
        interaction.channel.send({
            embeds: [new EmbedBuilder()
                .setTitle('🔗  Word Chain — Game Over!')
                .setDescription(`⏰ No one answered in time!\n\n📊 **${wordCount}** words • **${players.size}** player(s)\n\n${wordCount > 0 ? `🔗 ${lastWords}\n\n` : ''}${rating}`)
                .setColor(0xF39C12).setTimestamp()]
        });
    });
}

// ─── Emoji Quiz ──────────────────────────────────────────────────

async function handleEmojiQuiz(interaction) {
    const q = EMOJI_QUIZ[Math.floor(Math.random() * EMOJI_QUIZ.length)];
    const embed = new EmbedBuilder()
        .setTitle('🧩  Emoji Quiz')
        .setDescription(`Guess the movie/phrase:\n\n# ${q.emojis}`)
        .setColor(0xE67E22)
        .setFooter({ text: 'Type the answer exactly!' });

    await interaction.reply({ embeds: [embed] });

    try {
        const collected = await interaction.channel.awaitMessages({
            filter: m => m.content.toLowerCase() === q.answer.toLowerCase() && !m.author.bot,
            max: 1,
            time: 15_000,
            errors: ['time']
        });

        const msg = collected.first();
        const reward = 100;
        const xp = 30;

        db.addBalance(msg.author.id, reward);
        db.addXp(msg.author.id, xp);

        await msg.reply({
            embeds: [new EmbedBuilder()
                .setTitle('🎉  Correct!')
                .setDescription(`The answer was **${q.answer}**.\nWinner: ${msg.author}\nReward: 💰 **${reward}** | ✨ **${xp}** XP`)
                .setColor(0x2ECC71)]
        });
    } catch {
        await interaction.followUp({ content: `⏰ Time's up! The answer was **${q.answer}**.`, ephemeral: true });
    }
}

// ─── Multiplayer Card Battle ─────────────────────────────────────

async function handleCardBattle(interaction) {
    const bet = interaction.options.getInteger('bet') || 0;
    const author = db.getUser(interaction.user.id);

    if (bet > 0) {
        if (author.balance < bet) return interaction.reply({ content: `❌ You need **${bet}** coins to start this lobby.`, ephemeral: true });
        db.removeBalance(author.id, bet);
    }

    const hostId = interaction.user.id;
    const players = new Set([hostId]);
    const deck = [];
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    // Build deck
    for (const s of suits) {
        for (const r of ranks) {
            deck.push({ suit: s, rank: r, value: ranks.indexOf(r) + 2 });
        }
    }

    const lobbyEmbed = new EmbedBuilder()
        .setTitle('🃏  High Card Battle')
        .setDescription(`**Host:** ${interaction.user}\n**Bet:** 💰 ${bet}\n\nPlayers: 1\n\n*Click Join to enter!*`)
        .setColor(0x9B59B6);

    const joinRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`join_card_${hostId}`).setLabel('Join').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`start_card_${hostId}`).setLabel('Start Game').setStyle(ButtonStyle.Primary)
    );

    const reply = await interaction.reply({ embeds: [lobbyEmbed], components: [joinRow], fetchReply: true });

    const collector = reply.createMessageComponentCollector({ time: 60_000 });

    collector.on('collect', async i => {
        if (i.customId === `join_card_${hostId}`) {
            if (players.has(i.user.id)) return i.reply({ content: '❌ You already joined!', ephemeral: true });

            if (bet > 0) {
                const p = db.getUser(i.user.id);
                if (p.balance < bet) return i.reply({ content: `❌ You need **${bet}** coins to join!`, ephemeral: true });
                db.removeBalance(i.user.id, bet);
            }

            players.add(i.user.id);
            lobbyEmbed.setDescription(`**Host:** ${interaction.user}\n**Bet:** 💰 ${bet}\n\nPlayers: ${players.size}\n${Array.from(players).map(id => `<@${id}>`).join(', ')}\n\n*Click Join to enter!*`);
            await i.update({ embeds: [lobbyEmbed] });
        }

        if (i.customId === `start_card_${hostId}`) {
            if (i.user.id !== hostId) return i.reply({ content: '❌ Only the host can start.', ephemeral: true });
            if (players.size < 2) return i.reply({ content: '❌ Need at least 2 players!', ephemeral: true });
            collector.stop('started');
        }
    });

    collector.on('end', async (_, reason) => {
        if (reason !== 'started') {
            // Refund host if timed out
            if (bet > 0) db.addBalance(hostId, bet);
            return interaction.editReply({ content: '⏰ Lobby timed out.', components: [] });
        }

        // Game Start
        let results = [];
        let highestVal = -1;
        let winners = [];

        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        for (const pid of players) {
            const card = deck.pop();
            results.push({ id: pid, card });
            if (card.value > highestVal) {
                highestVal = card.value;
                winners = [pid];
            } else if (card.value === highestVal) {
                winners.push(pid);
            }
        }

        const pot = bet * players.size;
        const prize = Math.floor(pot / winners.length);

        winners.forEach(w => db.addBalance(w, prize));

        const resultText = results.map(r => `<@${r.id}>: **${r.card.rank}${r.card.suit}**`).join('\n');
        const winnerText = winners.map(w => `<@${w}>`).join(', ');

        const gameEmbed = new EmbedBuilder()
            .setTitle('🃏  Card Battle Results')
            .setDescription(`${resultText}\n\n🏆 **Winner(s):** ${winnerText}\n💰 **Prize:** ${prize} coins`)
            .setColor(0xF1C40F);

        await interaction.editReply({ embeds: [gameEmbed], components: [] });
    });
}

// ─── Minesweeper ─────────────────────────────────────────────────

async function handleMinesweeper(interaction) {
    const size = interaction.options.getInteger('size') || 8;
    const mines = interaction.options.getInteger('mines') || 10;

    if (mines >= size * size) {
        return interaction.reply({ content: '❌ Too many mines for this grid size!', ephemeral: true });
    }

    // Initialize grid
    const grid = Array(size).fill().map(() => Array(size).fill(0));
    const mineLocs = new Set();

    // Place mines
    while (mineLocs.size < mines) {
        const r = Math.floor(Math.random() * size);
        const c = Math.floor(Math.random() * size);
        const key = `${r},${c}`;
        if (!mineLocs.has(key)) {
            mineLocs.add(key);
            grid[r][c] = '💣';
        }
    }

    // Calculate numbers
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (grid[r][c] === '💣') continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === '💣') count++;
                }
            }
            grid[r][c] = count === 0 ? '🟦' : ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'][count - 1];
        }
    }

    // Format grid
    const board = grid.map(row => row.map(cell => `||${cell}||`).join('')).join('\n');

    const embed = new EmbedBuilder()
        .setTitle(`💣  Minesweeper (${size}x${size})`)
        .setDescription(`Find the **${mines}** mines!\n\n${board}`)
        .setColor(0xE74C3C);

    return interaction.reply({ embeds: [embed] });
}

// ─── Hangman ─────────────────────────────────────────────────────

async function handleHangman(interaction) {
    const wordObj = SCRAMBLE_WORDS[Math.floor(Math.random() * SCRAMBLE_WORDS.length)];
    const word = wordObj.word.toUpperCase();
    const hint = wordObj.hint;
    const guessed = new Set();
    let lives = 6;
    let gameOver = false;

    function getDisplay() {
        return word.split('').map(l => guessed.has(l) ? l : '\\_').join(' ');
    }

    const embed = new EmbedBuilder()
        .setTitle('😵  Hangman')
        .setDescription(`**Hint:** ${hint}\n\n**Word:** ${getDisplay()}\n**Lives:** ${'❤️'.repeat(lives)}\n\n**Guessed:** ${Array.from(guessed).join(', ') || 'None'}`)
        .setColor(0x3498DB)
        .setFooter({ text: 'Type a letter to guess!' });

    await interaction.reply({ embeds: [embed] });
    const message = await interaction.fetchReply();

    const collector = interaction.channel.createMessageCollector({
        filter: m => m.author.id === interaction.user.id && /^[a-zA-Z]$/.test(m.content) && !m.author.bot,
        time: 120_000
    });

    collector.on('collect', async m => {
        if (gameOver) return;
        m.delete().catch(() => { }); // Try to clean up user messages

        const letter = m.content.toUpperCase();
        if (guessed.has(letter)) return; // Already guessed

        guessed.add(letter);

        if (!word.includes(letter)) {
            lives--;
        }

        const currentDisplay = getDisplay();
        const won = !currentDisplay.includes('\\_');
        const lost = lives <= 0;

        if (won || lost) {
            gameOver = true;
            embed.setDescription(`**Word:** ${word}\n\n${won ? '🎉 **YOU WON!**' : '💀 **YOU DIED!**'}`)
                .setColor(won ? 0x2ECC71 : 0xE74C3C);
            collector.stop();
        } else {
            embed.setDescription(`**Hint:** ${hint}\n\n**Word:** ${currentDisplay}\n**Lives:** ${'❤️'.repeat(lives)}\n\n**Guessed:** ${Array.from(guessed).join(', ')}`);
        }

        await message.edit({ embeds: [embed] });
    });

    collector.on('end', (_, reason) => {
        if (reason === 'time' && !gameOver) {
            embed.setDescription(`⏰ **Time's up!** The word was **${word}**.`).setColor(0x95A5A6);
            message.edit({ embeds: [embed] });
        }
    });
}
