const { EmbedBuilder } = require('discord.js');
const db = require('../../database');

const EMOJI_QUIZ = [
    // ═══ Movies ═══
    { emojis: '🦁👑', answers: ['the lion king', 'lion king'], category: '🎬 Movie' },
    { emojis: '⚡🧙‍♂️👓', answers: ['harry potter'], category: '🎬 Movie' },
    { emojis: '🦇👨', answers: ['batman'], category: '🎬 Movie' },
    { emojis: '🕸️🕷️👨', answers: ['spiderman', 'spider-man', 'spider man'], category: '🎬 Movie' },
    { emojis: '🚢🧊💔', answers: ['titanic'], category: '🎬 Movie' },
    { emojis: '🦖🦕🏞️', answers: ['jurassic park', 'jurassic world'], category: '🎬 Movie' },
    { emojis: '👽🚲🌕', answers: ['et', 'e.t.', 'e.t'], category: '🎬 Movie' },
    { emojis: '👻🚫👨‍🚒', answers: ['ghostbusters'], category: '🎬 Movie' },
    { emojis: '🔍🐠', answers: ['finding nemo'], category: '🎬 Movie' },
    { emojis: '🐼🥋', answers: ['kung fu panda'], category: '🎬 Movie' },
    { emojis: '🍎👸🏰', answers: ['snow white'], category: '🎬 Movie' },
    { emojis: '🧞‍♂️✨🐒', answers: ['aladdin'], category: '🎬 Movie' },
    { emojis: '🚀🌌⚔️', answers: ['star wars'], category: '🎬 Movie' },
    { emojis: '💍🌋👣', answers: ['lord of the rings', 'lotr'], category: '🎬 Movie' },
    { emojis: '🏴‍☠️🦜🚢', answers: ['pirates of the caribbean'], category: '🎬 Movie' },
    { emojis: '🤠🧸🚀', answers: ['toy story'], category: '🎬 Movie' },
    { emojis: '🍫🏭🎫', answers: ['charlie and the chocolate factory', 'willy wonka'], category: '🎬 Movie' },
    { emojis: '🤡🎈😱', answers: ['it'], category: '🎬 Movie' },
    { emojis: '🐀👨‍🍳🍲', answers: ['ratatouille'], category: '🎬 Movie' },
    { emojis: '🧠💭😄', answers: ['inside out'], category: '🎬 Movie' },
    { emojis: '❄️👸⛄', answers: ['frozen'], category: '🎬 Movie' },
    { emojis: '🐉🏯👩‍🦰⚔️', answers: ['mulan'], category: '🎬 Movie' },
    { emojis: '🧜‍♀️🌊🐚', answers: ['the little mermaid', 'little mermaid'], category: '🎬 Movie' },
    { emojis: '🏹👸🐻', answers: ['brave'], category: '🎬 Movie' },
    { emojis: '🎃👻🎅', answers: ['the nightmare before christmas', 'nightmare before christmas'], category: '🎬 Movie' },
    { emojis: '🤖🌱🌍', answers: ['wall-e', 'wall e', 'walle'], category: '🎬 Movie' },
    { emojis: '👴🎈🏠', answers: ['up'], category: '🎬 Movie' },
    { emojis: '🐟🔍💙', answers: ['finding dory'], category: '🎬 Movie' },
    { emojis: '🦈🌊😱', answers: ['jaws'], category: '🎬 Movie' },
    { emojis: '💀🌮🎸', answers: ['coco'], category: '🎬 Movie' },
    { emojis: '🤖👦🔫🔥', answers: ['terminator', 'the terminator'], category: '🎬 Movie' },
    { emojis: '🧟‍♂️🌍🔫', answers: ['world war z'], category: '🎬 Movie' },
    { emojis: '🥊🏆🇮🇹', answers: ['rocky'], category: '🎬 Movie' },
    { emojis: '🦸‍♂️🔨⚡', answers: ['thor'], category: '🎬 Movie' },
    { emojis: '🕶️💊🤖', answers: ['the matrix', 'matrix'], category: '🎬 Movie' },
    { emojis: '🚗⚡🔙⏰', answers: ['back to the future'], category: '🎬 Movie' },
    { emojis: '👩‍🚀🌌🕳️', answers: ['interstellar'], category: '🎬 Movie' },
    { emojis: '🎭😈👼', answers: ['the exorcist', 'exorcist'], category: '🎬 Movie' },
    { emojis: '🐝🎬🤣', answers: ['bee movie'], category: '🎬 Movie' },
    { emojis: '🏠👦🪤🎄', answers: ['home alone'], category: '🎬 Movie' },
    { emojis: '🧊🦥🐿️', answers: ['ice age'], category: '🎬 Movie' },
    { emojis: '🐕🛷❄️', answers: ['balto'], category: '🎬 Movie' },
    { emojis: '👸🐸💋', answers: ['the princess and the frog', 'princess and the frog'], category: '🎬 Movie' },
    { emojis: '🚗🏁💨', answers: ['cars'], category: '🎬 Movie' },
    { emojis: '👨‍🦲💎🔫', answers: ['breaking bad'], category: '📺 TV Show' },
    { emojis: '🧪👨‍🔬💀', answers: ['breaking bad'], category: '📺 TV Show' },

    // ═══ TV Shows ═══
    { emojis: '👑🗡️🐉', answers: ['game of thrones', 'got'], category: '📺 TV Show' },
    { emojis: '🧟‍♂️🔫🏚️', answers: ['the walking dead', 'walking dead', 'twd'], category: '📺 TV Show' },
    { emojis: '👨‍👩‍👧‍👦🏠😂', answers: ['modern family'], category: '📺 TV Show' },
    { emojis: '☕👫👫👫', answers: ['friends'], category: '📺 TV Show' },
    { emojis: '🏢📋😐', answers: ['the office', 'office'], category: '📺 TV Show' },
    { emojis: '🔬🤓🤓🤓🤓', answers: ['the big bang theory', 'big bang theory'], category: '📺 TV Show' },
    { emojis: '👽🛸🔭🧒', answers: ['stranger things'], category: '📺 TV Show' },
    { emojis: '🏴‍☠️🧭🗺️', answers: ['one piece'], category: '📺 TV Show' },
    { emojis: '🍊⬛🏢', answers: ['orange is the new black'], category: '📺 TV Show' },
    { emojis: '🧊🔥👑🗡️', answers: ['game of thrones', 'got'], category: '📺 TV Show' },
    { emojis: '🏥👨‍⚕️💊', answers: ['greys anatomy', "grey's anatomy", 'house', 'dr house'], category: '📺 TV Show' },
    { emojis: '🔎🎩🧥', answers: ['sherlock'], category: '📺 TV Show' },
    { emojis: '💉🧛‍♂️🌙', answers: ['vampire diaries', 'the vampire diaries'], category: '📺 TV Show' },
    { emojis: '🦸‍♂️🌆🦹‍♂️', answers: ['the boys', 'boys'], category: '📺 TV Show' },
    { emojis: '🏫🎒👩‍🎓💀', answers: ['elite'], category: '📺 TV Show' },

    // ═══ Songs / Music ═══
    { emojis: '🎵👶👶👶', answers: ['baby', 'baby by justin bieber'], category: '🎵 Song' },
    { emojis: '🌧️☔😢', answers: ['umbrella', 'singing in the rain'], category: '🎵 Song' },
    { emojis: '🎤👸💍', answers: ['single ladies'], category: '🎵 Song' },
    { emojis: '🌈🌧️👋', answers: ['somewhere over the rainbow', 'over the rainbow'], category: '🎵 Song' },
    { emojis: '🎸🤘😈🔥', answers: ['highway to hell'], category: '🎵 Song' },
    { emojis: '💃🕺🪩🎶', answers: ['dancing queen'], category: '🎵 Song' },
    { emojis: '🎹🌙✨', answers: ['moonlight sonata', 'clair de lune'], category: '🎵 Song' },
    { emojis: '👁️🐅🔥', answers: ['eye of the tiger'], category: '🎵 Song' },
    { emojis: '💔😭🎤', answers: ['someone like you', 'all by myself'], category: '🎵 Song' },
    { emojis: '🦋✨🎶', answers: ['butterfly', 'wings'], category: '🎵 Song' },
    { emojis: '🌊🏄‍♂️☀️', answers: ['surfin usa', 'ocean eyes'], category: '🎵 Song' },
    { emojis: '🔥🎤👩‍🎤💅', answers: ['girl on fire'], category: '🎵 Song' },
    { emojis: '💎🌌🎵', answers: ['diamonds', 'lucy in the sky with diamonds'], category: '🎵 Song' },

    // ═══ Food & Drink ═══
    { emojis: '🍕🇮🇹🧀', answers: ['pizza'], category: '🍽️ Food' },
    { emojis: '🍔🍟🥤', answers: ['mcdonalds', "mcdonald's", 'burger', 'fast food'], category: '🍽️ Food' },
    { emojis: '🍣🇯🇵🥢', answers: ['sushi'], category: '🍽️ Food' },
    { emojis: '🌮🇲🇽🌶️', answers: ['taco', 'tacos', 'mexican food'], category: '🍽️ Food' },
    { emojis: '🍝🇮🇹🧄', answers: ['pasta', 'spaghetti'], category: '🍽️ Food' },
    { emojis: '🥐☕🇫🇷', answers: ['croissant', 'french breakfast'], category: '🍽️ Food' },
    { emojis: '🍦🍫🍓', answers: ['ice cream', 'sundae'], category: '🍽️ Food' },
    { emojis: '🧁🎂🎉', answers: ['birthday cake', 'cake', 'cupcake'], category: '🍽️ Food' },
    { emojis: '🥟🇨🇳🥢', answers: ['dumpling', 'dumplings', 'dim sum'], category: '🍽️ Food' },
    { emojis: '🍜🍥🇯🇵', answers: ['ramen'], category: '🍽️ Food' },
    { emojis: '🫕🧀🍷', answers: ['fondue', 'cheese fondue'], category: '🍽️ Food' },
    { emojis: '☕🥛🧊', answers: ['iced coffee', 'iced latte', 'latte'], category: '🍽️ Food' },

    // ═══ Animals ═══
    { emojis: '🖤⬜🐻', answers: ['panda', 'giant panda'], category: '🐾 Animal' },
    { emojis: '🦈🌊😬', answers: ['shark', 'great white shark'], category: '🐾 Animal' },
    { emojis: '🐧❄️🇦🇶', answers: ['penguin'], category: '🐾 Animal' },
    { emojis: '🦁🌍🔥', answers: ['lion'], category: '🐾 Animal' },
    { emojis: '🦅🏔️🇺🇸', answers: ['bald eagle', 'eagle'], category: '🐾 Animal' },
    { emojis: '🐙🌊🧠', answers: ['octopus'], category: '🐾 Animal' },
    { emojis: '🦋🌸🌈', answers: ['butterfly'], category: '🐾 Animal' },
    { emojis: '🐺🌕🌲', answers: ['wolf'], category: '🐾 Animal' },
    { emojis: '🐢🌊🐚', answers: ['sea turtle', 'turtle'], category: '🐾 Animal' },
    { emojis: '🦩🌴💕', answers: ['flamingo'], category: '🐾 Animal' },
    { emojis: '🐋🌊💨', answers: ['whale', 'blue whale'], category: '🐾 Animal' },
    { emojis: '🦊❄️🌲', answers: ['fox', 'arctic fox'], category: '🐾 Animal' },

    // ═══ Countries ═══
    { emojis: '🗼🥖🧀', answers: ['france'], category: '🌍 Country' },
    { emojis: '🍕🏛️🤌', answers: ['italy'], category: '🌍 Country' },
    { emojis: '🗽🍔🇺🇸', answers: ['usa', 'united states', 'america'], category: '🌍 Country' },
    { emojis: '🗻🌸🍣', answers: ['japan'], category: '🌍 Country' },
    { emojis: '🦘🏖️🌏', answers: ['australia'], category: '🌍 Country' },
    { emojis: '🐉🏮🧧', answers: ['china'], category: '🌍 Country' },
    { emojis: '🌮🌵🎸', answers: ['mexico'], category: '🌍 Country' },
    { emojis: '☕🏏🕌', answers: ['india', 'turkey'], category: '🌍 Country' },
    { emojis: '🍀🍺🏰', answers: ['ireland'], category: '🌍 Country' },
    { emojis: '⚽🎉🏖️', answers: ['brazil'], category: '🌍 Country' },
    { emojis: '🏔️🧀🍫', answers: ['switzerland'], category: '🌍 Country' },
    { emojis: '🎭🥂🗼', answers: ['france', 'paris'], category: '🌍 Country' },
    { emojis: '🐻❄️🏒', answers: ['russia', 'canada'], category: '🌍 Country' },
    { emojis: '🏺⚓🏖️', answers: ['greece'], category: '🌍 Country' },
    { emojis: '🌷🚲🧀', answers: ['netherlands', 'holland'], category: '🌍 Country' },

    // ═══ Sports ═══
    { emojis: '⚽🏆🌍', answers: ['world cup', 'football', 'soccer'], category: '⚽ Sport' },
    { emojis: '🏀🏆🇺🇸', answers: ['nba', 'basketball'], category: '⚽ Sport' },
    { emojis: '🎾🏟️🍓', answers: ['wimbledon', 'tennis'], category: '⚽ Sport' },
    { emojis: '🏈🏆🍗', answers: ['super bowl', 'football', 'nfl'], category: '⚽ Sport' },
    { emojis: '🏊‍♂️🚴‍♂️🏃‍♂️', answers: ['triathlon'], category: '⚽ Sport' },
    { emojis: '🥊🔔💪', answers: ['boxing'], category: '⚽ Sport' },
    { emojis: '⛷️🏔️❄️', answers: ['skiing'], category: '⚽ Sport' },
    { emojis: '🏒🥅🧊', answers: ['ice hockey', 'hockey'], category: '⚽ Sport' },
    { emojis: '🤸‍♀️🏅✨', answers: ['gymnastics'], category: '⚽ Sport' },
    { emojis: '🏎️🏁💨', answers: ['formula 1', 'f1', 'racing'], category: '⚽ Sport' },

    // ═══ Video Games ═══
    { emojis: '🍄👨🏰', answers: ['mario', 'super mario'], category: '🎮 Game' },
    { emojis: '⛏️🟫🌲', answers: ['minecraft'], category: '🎮 Game' },
    { emojis: '🐔🏠🏝️', answers: ['animal crossing'], category: '🎮 Game' },
    { emojis: '⚽🚗💥', answers: ['rocket league'], category: '🎮 Game' },
    { emojis: '🔫🎯🏆', answers: ['fortnite', 'call of duty', 'cod'], category: '🎮 Game' },
    { emojis: '🗡️🛡️🧝', answers: ['zelda', 'the legend of zelda', 'legend of zelda'], category: '🎮 Game' },
    { emojis: '🟡⚫👻', answers: ['pac-man', 'pacman', 'pac man'], category: '🎮 Game' },
    { emojis: '🐹⚡🔴', answers: ['pokemon', 'pikachu'], category: '🎮 Game' },
    { emojis: '🏰🐲👸', answers: ['dragon quest', 'dark souls'], category: '🎮 Game' },
    { emojis: '🧱🟩🟦🟥', answers: ['tetris'], category: '🎮 Game' },
    { emojis: '⬇️🔵🏃', answers: ['sonic', 'sonic the hedgehog'], category: '🎮 Game' },
    { emojis: '🏗️🌆👷', answers: ['sim city', 'simcity', 'cities skylines'], category: '🎮 Game' },
    { emojis: '🧟🔫🌿', answers: ['plants vs zombies', 'pvz', 'resident evil'], category: '🎮 Game' },

    // ═══ Brands ═══
    { emojis: '🍎📱💻', answers: ['apple'], category: '🏢 Brand' },
    { emojis: '☕🧜‍♀️💚', answers: ['starbucks'], category: '🏢 Brand' },
    { emojis: '👟✔️🏃', answers: ['nike'], category: '🏢 Brand' },
    { emojis: '🎬🍿🟥', answers: ['netflix'], category: '🏢 Brand' },
    { emojis: '🔍🌐💻', answers: ['google'], category: '🏢 Brand' },
    { emojis: '📦😊🚚', answers: ['amazon'], category: '🏢 Brand' },
    { emojis: '🐦💙📱', answers: ['twitter', 'x'], category: '🏢 Brand' },
    { emojis: '📸💜🖼️', answers: ['instagram'], category: '🏢 Brand' },
    { emojis: '🎮🟦💿', answers: ['playstation', 'ps5', 'sony'], category: '🏢 Brand' },
    { emojis: '🟢🎮🕹️', answers: ['xbox', 'microsoft'], category: '🏢 Brand' },

    // ═══ Famous People ═══
    { emojis: '🎤👑💃', answers: ['beyonce'], category: '⭐ Celebrity' },
    { emojis: '🏀👑🐐', answers: ['lebron james', 'lebron', 'michael jordan', 'jordan'], category: '⭐ Celebrity' },
    { emojis: '🎸👑🟣', answers: ['prince'], category: '⭐ Celebrity' },
    { emojis: '🚀🔴🌌', answers: ['elon musk', 'elon'], category: '⭐ Celebrity' },
    { emojis: '🎤🦢👗', answers: ['taylor swift', 'taylor'], category: '⭐ Celebrity' },
    { emojis: '⚽🐐🇦🇷', answers: ['messi', 'lionel messi'], category: '⭐ Celebrity' },
    { emojis: '⚽🇵🇹💪', answers: ['ronaldo', 'cristiano ronaldo', 'cr7'], category: '⭐ Celebrity' },

    // ═══ Fairy Tales / Stories ═══
    { emojis: '🐺🏠🐷🐷🐷', answers: ['three little pigs', '3 little pigs'], category: '📖 Story' },
    { emojis: '👧🐻🥣🛏️', answers: ['goldilocks', 'goldilocks and the three bears'], category: '📖 Story' },
    { emojis: '🐸👑💋', answers: ['the frog prince', 'frog prince'], category: '📖 Story' },
    { emojis: '👧🌹🐺👵', answers: ['little red riding hood', 'red riding hood'], category: '📖 Story' },
    { emojis: '🧒🌱🏰☁️', answers: ['jack and the beanstalk'], category: '📖 Story' },
    { emojis: '🧑‍🦯👃📏', answers: ['pinocchio'], category: '📖 Story' },
    { emojis: '🦢👸💔', answers: ['swan lake', 'the ugly duckling', 'ugly duckling'], category: '📖 Story' },

    // ═══ Concepts / Phrases ═══
    { emojis: '💔🌧️😢', answers: ['heartbreak', 'sadness', 'broken heart'], category: '💡 Concept' },
    { emojis: '🌍✌️🕊️', answers: ['world peace', 'peace'], category: '💡 Concept' },
    { emojis: '⏰💰💵', answers: ['time is money'], category: '💡 Concept' },
    { emojis: '🐘🏠🤫', answers: ['elephant in the room'], category: '💡 Concept' },
    { emojis: '🧊🏔️🔝', answers: ['tip of the iceberg'], category: '💡 Concept' },
    { emojis: '🌈🦄✨', answers: ['fantasy', 'fairytale', 'magic', 'unicorn'], category: '💡 Concept' },
    { emojis: '🔥👖👖', answers: ['liar liar pants on fire', 'liar'], category: '💡 Concept' },
    { emojis: '💡🧠💪', answers: ['knowledge is power', 'big brain'], category: '💡 Concept' },
    { emojis: '🍏🍎⚖️', answers: ['apples and oranges', 'comparison'], category: '💡 Concept' },
    { emojis: '🐑🐑🐑💤', answers: ['counting sheep', 'insomnia', 'sleep'], category: '💡 Concept' },
    { emojis: '🌪️🧙‍♀️🏠', answers: ['wizard of oz', 'the wizard of oz'], category: '🎬 Movie' },

    // ═══ More Movies ═══
    { emojis: '🦸‍♂️🛡️⭐', answers: ['captain america'], category: '🎬 Movie' },
    { emojis: '🕷️🕸️🌌', answers: ['spider verse', 'into the spider verse', 'across the spider verse'], category: '🎬 Movie' },
    { emojis: '🤖❤️🌱', answers: ['wall-e', 'walle', 'wall e'], category: '🎬 Movie' },
    { emojis: '🦸‍♂️🟢💪', answers: ['hulk', 'the incredible hulk'], category: '🎬 Movie' },
    { emojis: '🐝🎥🍯', answers: ['bee movie'], category: '🎬 Movie' },
    { emojis: '👨‍🚀🌙🚀', answers: ['apollo 13', 'first man', 'moon'], category: '🎬 Movie' },
    { emojis: '🧛‍♂️🌙💉', answers: ['dracula', 'twilight'], category: '🎬 Movie' },
    { emojis: '🦍🏙️👸', answers: ['king kong'], category: '🎬 Movie' },
    { emojis: '🐊🏊‍♂️😱', answers: ['crawl', 'lake placid'], category: '🎬 Movie' },
    { emojis: '🎩🐇✨', answers: ['the prestige', 'now you see me'], category: '🎬 Movie' },
    { emojis: '👨‍👩‍👧‍👦🏠🐕', answers: ['marley and me', 'beethoven'], category: '🎬 Movie' },
    { emojis: '🌊🏄‍♂️🦈', answers: ['soul surfer', 'the shallows'], category: '🎬 Movie' },
    { emojis: '🤖🚗🔫', answers: ['transformers'], category: '🎬 Movie' },
    { emojis: '👸👠⏰🎃', answers: ['cinderella'], category: '🎬 Movie' },
    { emojis: '🧔🔪🏨', answers: ['the shining', 'psycho'], category: '🎬 Movie' },
    { emojis: '🏜️🪱🌌', answers: ['dune'], category: '🎬 Movie' },
    { emojis: '🐕‍🦺🧑‍🦯❤️', answers: ['a dogs purpose', 'hachi', 'hachiko'], category: '🎬 Movie' },
    { emojis: '👨‍🍳🐀🇫🇷', answers: ['ratatouille'], category: '🎬 Movie' },
    { emojis: '🏰🧙‍♀️🐈‍⬛', answers: ['kiki', "kiki's delivery service", 'howls moving castle'], category: '🎬 Movie' },
    { emojis: '🌸🏯⚔️🇯🇵', answers: ['the last samurai', 'last samurai', 'memoirs of a geisha'], category: '🎬 Movie' },

    // ═══ Anime ═══
    { emojis: '🍊👒🏴‍☠️', answers: ['one piece', 'luffy'], category: '🎌 Anime' },
    { emojis: '🦊🍥🥷', answers: ['naruto'], category: '🎌 Anime' },
    { emojis: '⚔️👹🌊', answers: ['demon slayer', 'kimetsu no yaiba'], category: '🎌 Anime' },
    { emojis: '🐉🟠7️⃣', answers: ['dragon ball', 'dragon ball z', 'dbz'], category: '🎌 Anime' },
    { emojis: '💀📓✍️', answers: ['death note'], category: '🎌 Anime' },
    { emojis: '👊🦸‍♂️💥', answers: ['one punch man'], category: '🎌 Anime' },
    { emojis: '⚔️🏰👑', answers: ['attack on titan', 'aot'], category: '🎌 Anime' },
    { emojis: '🏀🔵🔴', answers: ['kuroko no basket', 'slam dunk'], category: '🎌 Anime' },
    { emojis: '👻🎮🏠', answers: ['no game no life'], category: '🎌 Anime' },
    { emojis: '🧙‍♂️✨🏫', answers: ['fairy tail', 'jujutsu kaisen', 'jjk'], category: '🎌 Anime' },
    { emojis: '🤖👦🔧', answers: ['fullmetal alchemist', 'fma'], category: '🎌 Anime' },
    { emojis: '🏐🏫🏆', answers: ['haikyuu', 'haikyu'], category: '🎌 Anime' },
    { emojis: '👹🎭🌸', answers: ['demon slayer', 'tokyo ghoul'], category: '🎌 Anime' },
    { emojis: '🗡️🎮🌐', answers: ['sword art online', 'sao'], category: '🎌 Anime' },
    { emojis: '🏴‍☠️⛵🗺️🧭', answers: ['one piece'], category: '🎌 Anime' },
    { emojis: '🔮👁️🐍', answers: ['naruto', 'orochimaru', 'sasuke'], category: '🎌 Anime' },

    // ═══ Landmarks ═══
    { emojis: '🗼🇫🇷💡', answers: ['eiffel tower'], category: '🏛️ Landmark' },
    { emojis: '🗽🇺🇸🏝️', answers: ['statue of liberty'], category: '🏛️ Landmark' },
    { emojis: '🏯🌸🇯🇵', answers: ['japanese castle', 'temple', 'kyoto'], category: '🏛️ Landmark' },
    { emojis: '🧱🐉🇨🇳', answers: ['great wall of china', 'great wall'], category: '🏛️ Landmark' },
    { emojis: '🏛️🇬🇷☀️', answers: ['parthenon', 'acropolis'], category: '🏛️ Landmark' },
    { emojis: '🕌🇮🇳💎', answers: ['taj mahal'], category: '🏛️ Landmark' },
    { emojis: '🗿🏝️😶', answers: ['easter island', 'moai'], category: '🏛️ Landmark' },
    { emojis: '🎡🇬🇧🌉', answers: ['london eye', 'big ben', 'tower bridge'], category: '🏛️ Landmark' },
    { emojis: '🏔️🧊🇳🇵', answers: ['mount everest', 'everest'], category: '🏛️ Landmark' },
    { emojis: '🌋🏝️🌊', answers: ['hawaii', 'volcano', 'mount fuji'], category: '🏛️ Landmark' },
    { emojis: '🎰🌃💰', answers: ['las vegas', 'vegas'], category: '🏛️ Landmark' },
    { emojis: '🏟️⚔️🇮🇹', answers: ['colosseum', 'coliseum'], category: '🏛️ Landmark' },

    // ═══ Occupations ═══
    { emojis: '👨‍🚒🔥🚒', answers: ['firefighter', 'fireman'], category: '👔 Job' },
    { emojis: '👨‍🍳🔪🍽️', answers: ['chef', 'cook'], category: '👔 Job' },
    { emojis: '👩‍⚕️💉🏥', answers: ['doctor', 'nurse'], category: '👔 Job' },
    { emojis: '👨‍🚀🚀🌌', answers: ['astronaut'], category: '👔 Job' },
    { emojis: '👩‍🏫📚🏫', answers: ['teacher', 'professor'], category: '👔 Job' },
    { emojis: '👨‍✈️✈️☁️', answers: ['pilot'], category: '👔 Job' },
    { emojis: '🕵️‍♂️🔍📋', answers: ['detective', 'investigator'], category: '👔 Job' },
    { emojis: '👨‍🌾🌾🚜', answers: ['farmer'], category: '👔 Job' },
    { emojis: '👩‍🎤🎤🎵', answers: ['singer', 'musician'], category: '👔 Job' },
    { emojis: '👨‍💻💻☕', answers: ['programmer', 'developer', 'coder', 'software engineer'], category: '👔 Job' },

    // ═══ Emotions / Feelings ═══
    { emojis: '😍🦋🥰', answers: ['love', 'in love', 'butterflies'], category: '😊 Emotion' },
    { emojis: '😱👻🌑', answers: ['fear', 'scared', 'horror', 'terrified'], category: '😊 Emotion' },
    { emojis: '🤩⭐🎆', answers: ['excitement', 'excited', 'amazed'], category: '😊 Emotion' },
    { emojis: '😤💢🌋', answers: ['anger', 'angry', 'rage', 'furious'], category: '😊 Emotion' },
    { emojis: '😴💤🛏️', answers: ['sleepy', 'tired', 'exhausted', 'sleep'], category: '😊 Emotion' },
    { emojis: '🥺😢💧', answers: ['sad', 'sadness', 'crying'], category: '😊 Emotion' },
    { emojis: '🤔💭❓', answers: ['confused', 'thinking', 'curiosity', 'curious'], category: '😊 Emotion' },
    { emojis: '😎🕶️💪', answers: ['confident', 'cool', 'confidence'], category: '😊 Emotion' },

    // ═══ Superheroes ═══
    { emojis: '🦸‍♂️🔴🔵⭐', answers: ['captain america'], category: '🦸 Superhero' },
    { emojis: '🕷️👦🏙️', answers: ['spiderman', 'spider-man', 'spider man'], category: '🦸 Superhero' },
    { emojis: '🦇🌑🏙️', answers: ['batman', 'the dark knight', 'dark knight'], category: '🦸 Superhero' },
    { emojis: '🔨⚡👑', answers: ['thor'], category: '🦸 Superhero' },
    { emojis: '💚👊😡', answers: ['hulk', 'the hulk'], category: '🦸 Superhero' },
    { emojis: '🏹💜👁️', answers: ['hawkeye'], category: '🦸 Superhero' },
    { emojis: '🦸‍♀️👑🌟', answers: ['wonder woman'], category: '🦸 Superhero' },
    { emojis: '⚡🏃‍♂️🔴', answers: ['the flash', 'flash'], category: '🦸 Superhero' },
    { emojis: '🕶️💎🤖', answers: ['iron man', 'tony stark'], category: '🦸 Superhero' },
    { emojis: '🐈‍⬛👩💎', answers: ['catwoman', 'black cat', 'black widow'], category: '🦸 Superhero' },
    { emojis: '🕸️🦹‍♂️🟢', answers: ['green goblin', 'green lantern'], category: '🦸 Superhero' },
    { emojis: '🧲🔴🟣', answers: ['magneto'], category: '🦸 Superhero' },

    // ═══ More TV Shows ═══
    { emojis: '🧪💊👨‍🔬🏜️', answers: ['breaking bad'], category: '📺 TV Show' },
    { emojis: '👽🔬🏢', answers: ['the x files', 'x files'], category: '📺 TV Show' },
    { emojis: '🏝️✈️💀', answers: ['lost'], category: '📺 TV Show' },
    { emojis: '🧊🔥👑⚔️', answers: ['game of thrones', 'got'], category: '📺 TV Show' },
    { emojis: '🎤💃🌟', answers: ['glee', 'american idol'], category: '📺 TV Show' },
    { emojis: '💰🏠🏦💸', answers: ['money heist', 'la casa de papel'], category: '📺 TV Show' },
    { emojis: '♟️👑🤴', answers: ['the queens gambit', "queen's gambit"], category: '📺 TV Show' },
    { emojis: '🐴🍺🎭', answers: ['bojack horseman'], category: '📺 TV Show' },
    { emojis: '👨‍👩‍👧‍👦🟡🍩', answers: ['the simpsons', 'simpsons'], category: '📺 TV Show' },
    { emojis: '🧽⭐🍍🏠', answers: ['spongebob', 'spongebob squarepants'], category: '📺 TV Show' },
    { emojis: '👦🐕⏰🌈', answers: ['adventure time'], category: '📺 TV Show' },
    { emojis: '🧪👧👧👧', answers: ['powerpuff girls', 'the powerpuff girls'], category: '📺 TV Show' },

    // ═══ More Songs ═══
    { emojis: '🎵🌍👫', answers: ['we are the world'], category: '🎵 Song' },
    { emojis: '🔔🎄🎅', answers: ['jingle bells'], category: '🎵 Song' },
    { emojis: '🌠✨🎵', answers: ['twinkle twinkle little star', 'twinkle twinkle', 'shooting star'], category: '🎵 Song' },
    { emojis: '🎤🎶😭💔', answers: ['hello', 'someone like you', 'rolling in the deep'], category: '🎵 Song' },
    { emojis: '🏃‍♂️🌧️☔', answers: ['singing in the rain'], category: '🎵 Song' },
    { emojis: '🌊🎵😮', answers: ['ocean', 'ocean eyes', 'under the sea'], category: '🎵 Song' },
    { emojis: '🔥🎵🕺', answers: ['hot stuff', 'burn', 'fire'], category: '🎵 Song' },
    { emojis: '🎸🎤👨‍🎤🤘', answers: ['rock and roll', 'rock n roll', 'we will rock you'], category: '🎵 Song' },

    // ═══ More Video Games ═══
    { emojis: '🏰👸🍄🔥', answers: ['super mario', 'mario bros'], category: '🎮 Game' },
    { emojis: '🐔🔫🪂', answers: ['pubg', 'fortnite', 'free fire'], category: '🎮 Game' },
    { emojis: '⚡🟡🔴⚫', answers: ['pokemon'], category: '🎮 Game' },
    { emojis: '🧱🏠🎨', answers: ['roblox', 'lego'], category: '🎮 Game' },
    { emojis: '🗡️🧝‍♂️🏹🐴', answers: ['zelda', 'breath of the wild', 'tears of the kingdom'], category: '🎮 Game' },
    { emojis: '🏎️🍌🏆', answers: ['mario kart'], category: '🎮 Game' },
    { emojis: '🌾🐄🏡', answers: ['stardew valley', 'harvest moon', 'farmville'], category: '🎮 Game' },
    { emojis: '🧩🔵🟠🔴', answers: ['among us', 'fall guys'], category: '🎮 Game' },
    { emojis: '🐉🗡️🛡️', answers: ['skyrim', 'dragon age', 'elden ring'], category: '🎮 Game' },
    { emojis: '🔫👮‍♂️🚗', answers: ['gta', 'grand theft auto'], category: '🎮 Game' },

    // ═══ More Countries ═══
    { emojis: '🥖🧈🍷🇫🇷', answers: ['france'], category: '🌍 Country' },
    { emojis: '🐨🏖️🦘', answers: ['australia'], category: '🌍 Country' },
    { emojis: '🎎🍵🗻', answers: ['japan'], category: '🌍 Country' },
    { emojis: '🍁🏒🦫', answers: ['canada'], category: '🌍 Country' },
    { emojis: '🐘🍛🏏', answers: ['india', 'sri lanka'], category: '🌍 Country' },
    { emojis: '🏔️🧘‍♂️🙏', answers: ['nepal', 'tibet'], category: '🌍 Country' },
    { emojis: '🐪🏜️🕌', answers: ['egypt', 'saudi arabia', 'dubai'], category: '🌍 Country' },
    { emojis: '🎭🥐🧀🍷', answers: ['france'], category: '🌍 Country' },
    { emojis: '🍺🌭🏰', answers: ['germany'], category: '🌍 Country' },
    { emojis: '🐂🏖️🍹', answers: ['spain'], category: '🌍 Country' },
    { emojis: '🎋🐼🥟', answers: ['china'], category: '🌍 Country' },
    { emojis: '🥝🐑🏔️', answers: ['new zealand'], category: '🌍 Country' },

    // ═══ Holidays ═══
    { emojis: '🎄🎅🎁', answers: ['christmas'], category: '🎊 Holiday' },
    { emojis: '🎃👻🍬', answers: ['halloween'], category: '🎊 Holiday' },
    { emojis: '🐣🐰🥚', answers: ['easter'], category: '🎊 Holiday' },
    { emojis: '❤️💘🌹', answers: ['valentines day', "valentine's day", 'valentines'], category: '🎊 Holiday' },
    { emojis: '🦃🍁🥧', answers: ['thanksgiving'], category: '🎊 Holiday' },
    { emojis: '🎆🎇🥂', answers: ['new years', "new year's", 'new year', 'new years eve'], category: '🎊 Holiday' },
    { emojis: '☘️🟢🍺', answers: ['st patricks day', "saint patrick's day", 'st paddys day'], category: '🎊 Holiday' },
    { emojis: '🕎🕯️✡️', answers: ['hanukkah', 'chanukah'], category: '🎊 Holiday' },

    // ═══ Science ═══
    { emojis: '🌍🌡️🔥', answers: ['global warming', 'climate change'], category: '🔬 Science' },
    { emojis: '🧬🔬👨‍🔬', answers: ['dna', 'genetics', 'biology'], category: '🔬 Science' },
    { emojis: '⚛️💥🔬', answers: ['nuclear', 'atom', 'physics'], category: '🔬 Science' },
    { emojis: '🌌🔭⭐', answers: ['astronomy', 'stargazing'], category: '🔬 Science' },
    { emojis: '🦠😷💉', answers: ['pandemic', 'covid', 'virus', 'vaccination'], category: '🔬 Science' },
    { emojis: '🧲⚡🔋', answers: ['electricity', 'magnetism', 'energy'], category: '🔬 Science' },
    { emojis: '🌋🌍💨', answers: ['volcano', 'eruption'], category: '🔬 Science' },
    { emojis: '🪐🌌🛸', answers: ['space', 'universe', 'galaxy'], category: '🔬 Science' },

    // ═══ More Brands ═══
    { emojis: '🎵🟢📱', answers: ['spotify'], category: '🏢 Brand' },
    { emojis: '📺🔴▶️', answers: ['youtube'], category: '🏢 Brand' },
    { emojis: '🎮🟩🕹️', answers: ['xbox'], category: '🏢 Brand' },
    { emojis: '🍟🤡🟡🔴', answers: ['mcdonalds', "mcdonald's"], category: '🏢 Brand' },
    { emojis: '👻📸💛', answers: ['snapchat'], category: '🏢 Brand' },
    { emojis: '🎵🎬📱', answers: ['tiktok', 'tik tok'], category: '🏢 Brand' },
    { emojis: '💬🟣📱', answers: ['discord'], category: '🏢 Brand' },
    { emojis: '🚗⚡🔋', answers: ['tesla'], category: '🏢 Brand' },
    { emojis: '👑🍔🔥', answers: ['burger king'], category: '🏢 Brand' },
    { emojis: '🐦🔵✈️', answers: ['twitter', 'telegram'], category: '🏢 Brand' },

    // ═══ More Food ═══
    { emojis: '🥞🍁🧈', answers: ['pancakes', 'pancake'], category: '🍽️ Food' },
    { emojis: '🌯🥑🫘', answers: ['burrito'], category: '🍽️ Food' },
    { emojis: '🍩☕🍫', answers: ['donut', 'doughnut'], category: '🍽️ Food' },
    { emojis: '🥗🥒🍅', answers: ['salad'], category: '🍽️ Food' },
    { emojis: '🧇🍓🍯', answers: ['waffle', 'waffles'], category: '🍽️ Food' },
    { emojis: '🍿🎬🧂', answers: ['popcorn'], category: '🍽️ Food' },
    { emojis: '🫖🍵🇬🇧', answers: ['tea', 'english tea', 'afternoon tea'], category: '🍽️ Food' },
    { emojis: '🥐🍫☕', answers: ['breakfast', 'brunch'], category: '🍽️ Food' },
];

module.exports = {
    name: 'emojiquiz',
    aliases: ['quiz', 'eq'],
    description: 'Guess the phrase from emojis!',
    cooldown: 30,
    async execute(message, args) {
        const q = EMOJI_QUIZ[Math.floor(Math.random() * EMOJI_QUIZ.length)];
        const displayAnswer = q.answers[0].replace(/\b\w/g, c => c.toUpperCase()); // Title Case

        const embed = new EmbedBuilder()
            .setTitle('🧩  Emoji Quiz')
            .setDescription(`**${q.category}** — Guess what it is!\n\n# ${q.emojis}`)
            .setColor(0xE67E22)
            .setFooter({ text: '30s to answer • Type your guess!' });

        await message.reply({ embeds: [embed] });

        try {
            const collected = await message.channel.awaitMessages({
                filter: m => !m.author.bot && q.answers.some(a =>
                    m.content.toLowerCase().trim() === a ||
                    m.content.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '') === a.replace(/[^a-z0-9\s]/g, '')
                ),
                max: 1,
                time: 30_000,
                errors: ['time']
            });

            const msg = collected.first();
            const reward = 150;

            db.addBalance(msg.author.id, reward);

            await msg.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('🎉  Correct!')
                    .setDescription(`The answer was **${displayAnswer}**.\nWinner: ${msg.author}\nReward: 💰 **${reward}** coins`)
                    .setColor(0x2ECC71)]
            });
        } catch {
            await message.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle('⏰  Time\'s Up!')
                    .setDescription(`Nobody got it! The answer was **${displayAnswer}**.`)
                    .setColor(0xE74C3C)]
            });
        }
    }
};
