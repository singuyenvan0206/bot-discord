const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database');

const TRIVIA_QUESTIONS = [
    // --- General Knowledge ---
    { q: "What is the capital of France?", a: "Paris", w: ["London", "Berlin", "Madrid"] },
    { q: "What is the largest mammal in the world?", a: "Blue Whale", w: ["Elephant", "Giraffe", "Shark"] },
    { q: "How many continents are there?", a: "7", w: ["5", "6", "8"] },
    { q: "What is the currency of Japan?", a: "Yen", w: ["Won", "Dollar", "Euro"] },
    { q: "Which country is home to the Kangaroo?", a: "Australia", w: ["New Zealand", "South Africa", "Brazil"] },
    { q: "What is the hardest natural substance on Earth?", a: "Diamond", w: ["Gold", "Iron", "Platinum"] },
    { q: "In which year did the Titanic sink?", a: "1912", w: ["1905", "1915", "1920"] },
    { q: "What is the smallest country in the world?", a: "Vatican City", w: ["Monaco", "Nauru", "San Marino"] },
    { q: "Which language has the most native speakers?", a: "Mandarin", w: ["English", "Spanish", "Hindi"] },
    { q: "What is the national flower of Japan?", a: "Cherry Blossom", w: ["Rose", "Lotus", "Lily"] },
    { q: "What is the main ingredient in guacamole?", a: "Avocado", w: ["Tomato", "Onion", "Pepper"] },
    { q: "Which fruit has the seeds on the outside?", a: "Strawberry", w: ["Apple", "Orange", "Banana"] },
    { q: "What is the most consumed drink in the world (after water)?", a: "Tea", w: ["Coffee", "Soda", "Juice"] },
    { q: "Which animal is known as the 'Ship of the Desert'?", a: "Camel", w: ["Horse", "Elephant", "Donkey"] },
    { q: "How many colors are in a rainbow?", a: "7", w: ["6", "8", "5"] },
    { q: "What is the largest organ in the human body?", a: "Skin", w: ["Liver", "Heart", "Lungs"] },
    { q: "Which symbol represents 'Copyright'?", a: "©", w: ["®", "™", "@"] },
    { q: "What is the freezing point of water?", a: "0°C", w: ["10°C", "-10°C", "32°C"] },
    { q: "How many players are on a soccer team?", a: "11", w: ["10", "12", "9"] },
    { q: "What is the capital of Italy?", a: "Rome", w: ["Milan", "Venice", "Florence"] },
    { q: "What does 'www' stand for?", a: "World Wide Web", w: ["World Web Wide", "Wide World Web", "Web World Wide"] },
    { q: "Which month has 28 days?", a: "All of them", w: ["February", "June", "September"] },
    { q: "What is the common name for dried plums?", a: "Prunes", w: ["Raisins", "Dates", "Figs"] },
    { q: "Which planet is closest to the sun?", a: "Mercury", w: ["Venus", "Mars", "Earth"] },
    { q: "How many legs does a spider have?", a: "8", w: ["6", "10", "12"] },
    { q: "What is the name of the fairy in Peter Pan?", a: "Tinkerbell", w: ["Wendy", "Fiona", "Cinderella"] },
    { q: "Which color is an emerald?", a: "Green", w: ["Red", "Blue", "Yellow"] },
    { q: "What is the opposite of 'matter'?", a: "Antimatter", w: ["Energy", "Space", "Time"] },
    { q: "Who is the patron saint of Ireland?", a: "St. Patrick", w: ["St. George", "St. Andrew", "St. David"] },
    { q: "What is the official language of Brazil?", a: "Portuguese", w: ["Spanish", "French", "Italian"] },

    // --- Science & Nature ---
    { q: "Which planet is known as the Red Planet?", a: "Mars", w: ["Venus", "Jupiter", "Saturn"] },
    { q: "What is the chemical symbol for water?", a: "H2O", w: ["CO2", "O2", "NaCl"] },
    { q: "Which element has the atomic number 1?", a: "Hydrogen", w: ["Oxygen", "Carbon", "Helium"] },
    { q: "What is the fastest land animal?", a: "Cheetah", w: ["Lion", "Tiger", "Leopard"] },
    { q: "What is the boiling point of water?", a: "100°C", w: ["90°C", "110°C", "120°C"] },
    { q: "What part of the plant conducts photosynthesis?", a: "Leaf", w: ["Root", "Stem", "Flower"] },
    { q: "How many bones are in the adult human body?", a: "206", w: ["200", "210", "212"] },
    { q: "What gas do plants absorb from the atmosphere?", a: "Carbon Dioxide", w: ["Oxygen", "Nitrogen", "Hydrogen"] },
    { q: "Which planet is the hottest in the solar system?", a: "Venus", w: ["Mercury", "Mars", "Jupiter"] },
    { q: "What is the study of mushrooms called?", a: "Mycology", w: ["Botany", "Zoology", "Geology"] },
    { q: "Which planet has the most moons?", a: "Saturn", w: ["Jupiter", "Uranus", "Neptune"] },
    { q: "What is the powerhouse of the cell?", a: "Mitochondria", w: ["Nucleus", "Ribosome", "Cytoplasm"] },
    { q: "What is the most abundant gas in Earth's atmosphere?", a: "Nitrogen", w: ["Oxygen", "Carbon Dioxide", "Argon"] },
    { q: "Which blood type is the universal donor?", a: "O Negative", w: ["A Positive", "AB Negative", "O Positive"] },
    { q: "What is the largest bone in the human body?", a: "Femur", w: ["Tibia", "Humerus", "Skull"] },
    { q: "How many hearts does an octopus have?", a: "3", w: ["1", "2", "4"] },
    { q: "What is the nearest star to Earth?", a: "The Sun", w: ["Proxim Centauri", "Sirius", "Alpha Centauri"] },
    { q: "Which animal sleeps standing up?", a: "Horse", w: ["Cow", "Pig", "Dog"] },
    { q: "What is the chemical symbol for Gold?", a: "Au", w: ["Ag", "Fe", "Cu"] },
    { q: "What measures earthquake magnitude?", a: "Richter Scale", w: ["Barometer", "Thermometer", "Seismograph"] },
    { q: "What is the speed of light?", a: "299,792 km/s", w: ["300,000 km/s", "150,000 km/s", "1,000,000 km/s"] },
    { q: "Which cloud type is associated with thunderstorms?", a: "Cumulonimbus", w: ["Stratus", "Cirrus", "Cumulus"] },
    { q: "What is the center of an atom called?", a: "Nucleus", w: ["Proton", "Electron", "Neutron"] },
    { q: "Which planet is known for its rings?", a: "Saturn", w: ["Jupiter", "Uranus", "Neptune"] },
    { q: "What is the hardest mineral?", a: "Diamond", w: ["Quartz", "Topaz", "Corundum"] },
    { q: "Which animal has the longest lifespan?", a: "Greenland Shark", w: ["Blue Whale", "Elephant", "Tortoise"] },
    { q: "What is the main gas found in the air we breathe?", a: "Nitrogen", w: ["Oxygen", "Carbon Dioxide", "Hydrogen"] },
    { q: "Which part of the brain controls balance?", a: "Cerebellum", w: ["Cerebrum", "Brainstem", "Thalamus"] },
    { q: "What is the chemical formula for salt?", a: "NaCl", w: ["KCl", "NaOH", "HCl"] },
    { q: "Which vitamin is produced by the skin when exposed to sunlight?", a: "Vitamin D", w: ["Vitamin C", "Vitamin A", "Vitamin B"] },

    // --- History & Literature ---
    { q: "Who wrote 'Romeo and Juliet'?", a: "William Shakespeare", w: ["Charles Dickens", "Jane Austen", "Mark Twain"] },
    { q: "Who painted the Mona Lisa?", a: "Leonardo da Vinci", w: ["Pablo Picasso", "Vincent van Gogh", "Claude Monet"] },
    { q: "What year did World War II end?", a: "1945", w: ["1944", "1946", "1950"] },
    { q: "Who was the first President of the United States?", a: "George Washington", w: ["Thomas Jefferson", "Abraham Lincoln", "John Adams"] },
    { q: "Which empire built the Colosseum?", a: "Roman", w: ["Greek", "Ottoman", "Egyptian"] },
    { q: "Who discovered America in 1492?", a: "Christopher Columbus", w: ["Amerigo Vespucci", "Ferdinand Magellan", "Marco Polo"] },
    { q: "What was the name of the ship Charles Darwin sailed on?", a: "HMS Beagle", w: ["HMS Victory", "Santa Maria", "Mayflower"] },
    { q: "Who wrote 'Harry Potter'?", a: "J.K. Rowling", w: ["J.R.R. Tolkien", "George R.R. Martin", "Stephen King"] },
    { q: "Which ancient wonder was located in Alexandria?", a: "The Lighthouse", w: ["The Library", "The Pyramids", "The Hanging Gardens"] },
    { q: "Who was the first man to walk on the moon?", a: "Neil Armstrong", w: ["Buzz Aldrin", "Yuri Gagarin", "Michael Collins"] },
    { q: "Who was the Queen of Egypt known for her beauty?", a: "Cleopatra", w: ["Nefertiti", "Hatshepsut", "Isis"] },
    { q: "Which war was fought between the North and South regions in the US?", a: "The Civil War", w: ["Revolutionary War", "World War I", "Vietnam War"] },
    { q: "Who invented the telephone?", a: "Alexander Graham Bell", w: ["Thomas Edison", "Nikola Tesla", "Benjamin Franklin"] },
    { q: "What is the longest epic poem in history?", a: "Mahabharata", w: ["The Odyssey", "The Iliad", "Beowulf"] },
    { q: "Who wrote 'The Hobbit'?", a: "J.R.R. Tolkien", w: ["C.S. Lewis", "George R.R. Martin", "Ursula K. Le Guin"] },
    { q: "Which city was destroyed by Mount Vesuvius?", a: "Pompeii", w: ["Rome", "Athens", "Sparta"] },
    { q: "What year did the Berlin Wall fall?", a: "1989", w: ["1991", "1985", "1990"] },
    { q: "Who painted 'The Starry Night'?", a: "Vincent van Gogh", w: ["Pablo Picasso", "Salvador Dali", "Claude Monet"] },
    { q: "Which country gifted the Statue of Liberty to the US?", a: "France", w: ["England", "Italy", "Spain"] },
    { q: "What was the first capital of the United States?", a: "Philadelphia", w: ["New York", "Washington D.C.", "Boston"] },
    { q: "Who wrote '1984'?", a: "George Orwell", w: ["Aldous Huxley", "Ray Bradbury", "F. Scott Fitzgerald"] },
    { q: "Who was the last Tsar of Russia?", a: "Nicholas II", w: ["Peter the Great", "Ivan the Terrible", "Alexander I"] },
    { q: "What year did the French Revolution start?", a: "1789", w: ["1776", "1804", "1815"] },
    { q: "Who discovered penicillin?", a: "Alexander Fleming", w: ["Louis Pasteur", "Marie Curie", "Joseph Lister"] },
    { q: "Which king had six wives?", a: "Henry VIII", w: ["Louis XIV", "Charles II", "George III"] },
    { q: "What is the oldest civilization in history?", a: "Mesopotamia", w: ["Egypt", "Indus Valley", "China"] },
    { q: "Who wrote 'Pride and Prejudice'?", a: "Jane Austen", w: ["Charlotte Brontë", "Emily Brontë", "Virginia Woolf"] },
    { q: "Who was the Greek god of the sea?", a: "Poseidon", w: ["Zeus", "Hades", "Apollo"] },
    { q: "Which country was the first to use paper money?", a: "China", w: ["India", "Persia", "Rome"] },
    { q: "Who was the first woman to win a Nobel Prize?", a: "Marie Curie", w: ["Florence Nightingale", "Mother Teresa", "Rosa Parks"] },

    // --- Pop Culture (Movies, Games, Music) ---
    { q: "Who is the main character in the Legend of Zelda?", a: "Link", w: ["Zelda", "Ganon", "Mario"] },
    { q: "Which superhero is known as the 'Man of Steel'?", a: "Superman", w: ["Batman", "Iron Man", "Thor"] },
    { q: "What is the name of Mario's brother?", a: "Luigi", w: ["Wario", "Yoshi", "Toad"] },
    { q: "Which house does Harry Potter belong to?", a: "Gryffindor", w: ["Slytherin", "Hufflepuff", "Ravenclaw"] },
    { q: "What is the highest-grossing movie of all time?", a: "Avatar", w: ["Avengers: Endgame", "Titanic", "Star Wars"] },
    { q: "Who is the 'King of Pop'?", a: "Michael Jackson", w: ["Elvis Presley", "Prince", "Freddie Mercury"] },
    { q: "What color is Pac-Man?", a: "Yellow", w: ["Red", "Pink", "Blue"] },
    { q: "In Minecraft, what do Creepers do?", a: "Explode", w: ["Shoot arrows", "Teleport", "Fly"] },
    { q: "Which Pokémon is the mascot of the franchise?", a: "Pikachu", w: ["Charizard", "Eevee", "Bulbasaur"] },
    { q: "Who is the villain in 'The Lion King'?", a: "Scar", w: ["Mufasa", "Simba", "Timon"] },
    { q: "Which band performed 'Bohemian Rhapsody'?", a: "Queen", w: ["The Beatles", "Led Zeppelin", "Pink Floyd"] },
    { q: "Who lives in a pineapple under the sea?", a: "SpongeBob", w: ["Patrick", "Squidward", "Mr. Krabs"] },
    { q: "What is the name of the toy cowboy in Toy Story?", a: "Woody", w: ["Buzz", "Rex", "Slinky"] },
    { q: "Which city is Batman from?", a: "Gotham", w: ["Metropolis", "Star City", "Central City"] },
    { q: "What is the name of the kingdom in Frozen?", a: "Arendelle", w: ["Corona", "Atlantica", "Agrabah"] },
    { q: "Who plays Iron Man in the Marvel movies?", a: "Robert Downey Jr.", w: ["Chris Evans", "Chris Hemsworth", "Mark Ruffalo"] },
    { q: "What does the fox say?", a: "Ring-ding-ding-ding-dingeringeding!", w: ["Woof", "Meow", "Moo"] },
    { q: "Which video game features a character named Master Chief?", a: "Halo", w: ["Call of Duty", "Destiny", "Gears of War"] },
    { q: "What is the name of Han Solo's ship?", a: "Millennium Falcon", w: ["X-Wing", "TIE Fighter", "Death Star"] },
    { q: "In The Matrix, which pill does Neo take?", a: "Red", w: ["Blue", "Green", "Yellow"] },
    { q: "Who is the lead singer of The Beatles?", a: "John Lennon", w: ["Paul McCartney", "George Harrison", "Ringo Starr"] },
    { q: "What is the name of the hobbit in Lord of the Rings?", a: "Frodo", w: ["Bilbo", "Sam", "Pippin"] },
    { q: "Which TV show is set in Westeros?", a: "Game of Thrones", w: ["Breaking Bad", "The Witcher", "Vikings"] },
    { q: "What is the name of the spell used to disarm an opponent in Harry Potter?", a: "Expelliarmus", w: ["Avada Kedavra", "Lumos", "Alohomora"] },
    { q: "Who directed 'Jurassic Park'?", a: "Steven Spielberg", w: ["George Lucas", "James Cameron", "Christopher Nolan"] },
    { q: "What is the name of the coffee shop in 'Friends'?", a: "Central Perk", w: ["Central Park", "Coffee House", "Friends Cafe"] },
    { q: "Which game features 'Battle Royale' mode?", a: "Fortnite", w: ["Minecraft", "Overwatch", "Valorant"] },
    { q: "Who is the God of Thunder in Marvel?", a: "Thor", w: ["Loki", "Odin", "Hela"] },
    { q: "What is the name of Shrek's wife?", a: "Fiona", w: ["Cinderella", "Snow White", "Belle"] },
    { q: "Which band sang 'Smells Like Teen Spirit'?", a: "Nirvana", w: ["Pearl Jam", "Soundgarden", "Alice in Chains"] },

    // --- Geography ---
    { q: "Which ocean is the largest?", a: "Pacific Ocean", w: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean"] },
    { q: "What is the longest river in the world?", a: "Nile", w: ["Amazon", "Yangtze", "Mississippi"] },
    { q: "Mount Everest is located in which mountain range?", a: "Himalayas", w: ["Andes", "Rockies", "Alps"] },
    { q: "What is the capital of Canada?", a: "Ottawa", w: ["Toronto", "Vancouver", "Montreal"] },
    { q: "Which country has the most islands?", a: "Sweden", w: ["Indonesia", "Philippines", "Japan"] },
    { q: "What is the largest desert in the world?", a: "Antarctic Desert", w: ["Sahara", "Gobi", "Arabian"] },
    { q: "Which U.S. state is known as the Sunshine State?", a: "Florida", w: ["California", "Texas", "Hawaii"] },
    { q: "What carries blood away from the heart?", a: "Arteries", w: ["Veins", "Capillaries", "Nerves"] }, // Oops, anatomy slipped in here, kept for randomness
    { q: "Which country is shaped like a boot?", a: "Italy", w: ["Greece", "Spain", "France"] },
    { q: "What is the capital of Thailand?", a: "Bangkok", w: ["Phuket", "Chiang Mai", "Pattaya"] },
    { q: "Which continent is known as the 'Dark Continent'?", a: "Africa", w: ["Asia", "South America", "Australia"] },
    { q: "What refers to the line of latitude 0 degrees?", a: "Equator", w: ["Prime Meridian", "Tropic of Cancer", "Tropic of Capricorn"] },
    { q: "What is the smallest continent?", a: "Australia", w: ["Europe", "Antarctica", "South America"] },
    { q: "Which country has the Great Barrier Reef?", a: "Australia", w: ["USA", "Brazil", "Indonesia"] },
    { q: "What is the capital of Russia?", a: "Moscow", w: ["St. Petersburg", "Kiev", "Minsk"] },
    { q: "Which river flows through London?", a: "Thames", w: ["Seine", "Danube", "Rhine"] },
    { q: "What is the tallest building in the world?", a: "Burj Khalifa", w: ["Shanghai Tower", "Abraj Al-Bait", "Ping An Finance Centre"] },
    { q: "Which city is known as the 'Big Apple'?", a: "New York City", w: ["Los Angeles", "Chicago", "Miami"] },
    { q: "What is the capital of Australia?", a: "Canberra", w: ["Sydney", "Melbourne", "Brisbane"] },
    { q: "Which country is home to the Amazon Rainforest?", a: "Brazil", w: ["Peru", "Colombia", "Venezuela"] },

    // --- Technology & Math ---
    { q: "What does CPU stand for?", a: "Central Processing Unit", w: ["Computer Personal Unit", "Central Process Utility", "Central Processor Unit"] },
    { q: "Which programming language is this bot written in?", a: "JavaScript", w: ["Python", "Java", "C++"] },
    { q: "Who founded Microsoft?", a: "Bill Gates", w: ["Steve Jobs", "Mark Zuckerberg", "Jeff Bezos"] },
    { q: "What does 'HTML' stand for?", a: "HyperText Markup Language", w: ["HighTech Modem Language", "HyperText Model Link", "Home Tool Markup Language"] },
    { q: "Which company makes the iPhone?", a: "Apple", w: ["Samsung", "Google", "Sony"] },
    { q: "What does 'Wi-Fi' stand for?", a: "Wireless Fidelity", w: ["Wireless Field", "Wide Frequency", "World Internet"] },
    { q: "Which social media platform has a blue bird logo?", a: "Twitter", w: ["Facebook", "Instagram", "Snapchat"] },
    { q: "How many sides does a hexagon have?", a: "6", w: ["5", "7", "8"] },
    { q: "What is the square root of 64?", a: "8", w: ["6", "7", "9"] },
    { q: "What is 20% of 100?", a: "20", w: ["10", "50", "25"] },
    { q: "What is the value of Pi (approx)?", a: "3.14", w: ["3.12", "3.16", "3.18"] },
    { q: "Who invented the World Wide Web?", a: "Tim Berners-Lee", w: ["Bill Gates", "Steve Jobs", "Mark Zuckerberg"] },
    { q: "What does 'USB' stand for?", a: "Universal Serial Bus", w: ["United Serial Bus", "Universal System Bus", "Ultra Serial Bus"] },
    { q: "Which planet in our solar system is known for life?", a: "Earth", w: ["Mars", "Venus", "Jupiter"] },
    { q: "What is the binary representation of 10?", a: "1010", w: ["1000", "1100", "1110"] },
    { q: "Who is the CEO of Tesla?", a: "Elon Musk", w: ["Jeff Bezos", "Bill Gates", "Tim Cook"] },
    { q: "What does 'PDF' stand for?", a: "Portable Document Format", w: ["Personal Document File", "Printable Document Format", "Public Document File"] },
    { q: "Which company developed Windows?", a: "Microsoft", w: ["Apple", "IBM", "Google"] },
    { q: "What is the main circuit board in a computer called?", a: "Motherboard", w: ["CPU", "RAM", "Hard Drive"] },
    { q: "What does 'URL' stand for?", a: "Uniform Resource Locator", w: ["Universal Resource Locator", "Uniform Resource Link", "Universal Resource Link"] },

    // --- Sports ---
    { q: "Which sport uses a shuttlecock?", a: "Badminton", w: ["Tennis", "Squash", "Table Tennis"] },
    { q: "How long is a marathon?", a: "42.195 km", w: ["50 km", "20 km", "30 km"] },
    { q: "In which sport would you perform a slam dunk?", a: "Basketball", w: ["Volleyball", "Tennis", "Football"] },
    { q: "How many rings are in the Olympic logo?", a: "5", w: ["4", "6", "7"] },
    { q: "Which country won the 2018 FIFA World Cup?", a: "France", w: ["Croatia", "Brazil", "Germany"] },
    { q: "What is the national sport of Japan?", a: "Sumo Wrestling", w: ["Judo", "Karate", "Baseball"] },
    { q: "In bowling, what is it called when you knock down all pins in one roll?", a: "Strike", w: ["Spare", "Turkey", "Split"] },
    { q: "Who holds the record for the most Olympic gold medals?", a: "Michael Phelps", w: ["Usain Bolt", "Simone Biles", "Carl Lewis"] },
    { q: "Which golf tournament is played at Augusta National?", a: "The Masters", w: ["The US Open", "The Open Championship", "PGA Championship"] },
    { q: "In tennis, what is a score of zero called?", a: "Love", w: ["Zero", "Nil", "Nothing"] },
    { q: "How many players are on a baseball team?", a: "9", w: ["10", "11", "8"] },
    { q: "Which country invented cricket?", a: "England", w: ["India", "Australia", "South Africa"] },
    { q: "Who is considered the greatest basketball player of all time?", a: "Michael Jordan", w: ["LeBron James", "Kobe Bryant", "Shaquille O'Neal"] },
    { q: "What is the maximum score in a game of bowling?", a: "300", w: ["200", "250", "100"] },
    { q: "Which sport is known as 'the beautiful game'?", a: "Soccer", w: ["Basketball", "Tennis", "Cricket"] },
    { q: "How many quarters are in an NFL game?", a: "4", w: ["2", "3", "5"] },
    { q: "Who won the first Super Bowl?", a: "Green Bay Packers", w: ["Kansas City Chiefs", "New York Jets", "Dallas Cowboys"] },
    { q: "Which boxer was known as 'The Greatest'?", a: "Muhammad Ali", w: ["Mike Tyson", "Floyd Mayweather", "Rocky Marciano"] },
    { q: "In which sport is the Tour de France?", a: "Cycling", w: ["Running", "Swimming", "Rowing"] },
    { q: "What color jersey does the leader of the Tour de France wear?", a: "Yellow", w: ["Green", "Red", "White"] },

    // --- Mythology ---
    { q: "Who is the king of the Greek gods?", a: "Zeus", w: ["Poseidon", "Hades", "Apollo"] },
    { q: "Who is the Norse god of thunder?", a: "Thor", w: ["Odin", "Loki", "Freya"] },
    { q: "Who is the goddess of love in Greek mythology?", a: "Aphrodite", w: ["Athena", "Hera", "Artemis"] },
    { q: "What creature is half-man and half-horse?", a: "Centaur", w: ["Minotaur", "Satyr", "Griffin"] },
    { q: "Who killed Medusa?", a: "Perseus", w: ["Hercules", "Theseus", "Jason"] },
    { q: "What is the food of the gods?", a: "Ambrosia", w: ["Nectar", "Honey", "Wine"] },
    { q: "Who is the god of the underworld in Roman mythology?", a: "Pluto", w: ["Jupiter", "Mars", "Mercury"] },
    { q: "What bird is associated with reborn from ashes?", a: "Phoenix", w: ["Eagle", "Hawk", "Raven"] },
    { q: "Who stole fire from the gods?", a: "Prometheus", w: ["Epimetheus", "Atlas", "Cronus"] },
    { q: "Which hero performed 12 labors?", a: "Hercules", w: ["Achilles", "Odysseus", "Hector"] }
];

module.exports = {
    name: 'trivia',
    aliases: ['triv'],
    description: 'Test your knowledge',
    cooldown: 30,
    async execute(message, args) {
        const q = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
        const answers = [q.a, ...q.w].sort(() => Math.random() - 0.5);
        const correctIndex = answers.indexOf(q.a);

        const uid = Date.now().toString(36);
        const row = new ActionRowBuilder().addComponents(
            answers.map((ans, i) => new ButtonBuilder()
                .setCustomId(`trivia_${i}_${uid}`)
                .setLabel(ans)
                .setStyle(ButtonStyle.Primary)
            )
        );

        const embed = new EmbedBuilder()
            .setTitle('🧠  Trivia Time!')
            .setDescription(`**${q.q}**`)
            .setColor(0x9B59B6)
            .setFooter({ text: 'You have 15 seconds!' });

        const reply = await message.reply({ embeds: [embed], components: [row] });

        const collector = reply.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id && i.customId.endsWith(uid),
            time: 15_000,
            max: 1
        });

        collector.on('collect', async (i) => {
            const selectedIdx = parseInt(i.customId.split('_')[1]);
            const isCorrect = selectedIdx === correctIndex;

            // Only update balance if correct
            if (isCorrect) {
                db.addBalance(message.author.id, 50);
            }

            const resultEmbed = new EmbedBuilder()
                .setTitle(isCorrect ? '🎉  Correct!' : '❌  Wrong!')
                .setDescription(`The answer was **${q.a}**.\n\n${isCorrect ? 'You won 💰 **50** coins!' : 'Better luck next time!'}`)
                .setColor(isCorrect ? 0x2ECC71 : 0xE74C3C);

            const disabledRow = new ActionRowBuilder().addComponents(
                answers.map((ans, idx) => new ButtonBuilder()
                    .setCustomId(`trivia_${idx}_${uid}_end`)
                    .setLabel(ans)
                    .setStyle(idx === correctIndex ? ButtonStyle.Success : (idx === selectedIdx ? ButtonStyle.Danger : ButtonStyle.Secondary))
                    .setDisabled(true)
                )
            );

            await i.update({ embeds: [resultEmbed], components: [disabledRow] });
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                reply.edit({ embeds: [new EmbedBuilder().setTitle('⏰  Time\'s Up!').setDescription(`The answer was **${q.a}**.`).setColor(0x95A5A6)], components: [] }).catch(() => { });
            }
        });
    }
};
