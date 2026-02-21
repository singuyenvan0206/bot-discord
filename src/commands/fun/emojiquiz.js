const { EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { startCooldown } = require('../../utils/cooldown');
const { getLanguage, t } = require('../../utils/i18n');
const config = require('../../config');
const { getUserMultiplier } = require('../../utils/multiplier');

const EMOJI_QUIZ = [
    // ═══ Movies ═══
    { emojis: '🦁👑🐆🐗🌅', answers: ['the lion king', 'lion king', 'vua sư tử'], category: '🎬 Phim ảnh' },
    { emojis: '⚡🧙‍♂️👓🏰🦉', answers: ['harry potter'], category: '🎬 Phim ảnh' },
    { emojis: '🦇👨🏙️🌃👊', answers: ['batman', 'người dơi'], category: '🎬 Phim ảnh' },
    { emojis: '🕸️🕷️👨🏙️🤟', answers: ['spiderman', 'spider-man', 'spider man', 'người nhện'], category: '🎬 Phim ảnh' },
    { emojis: '🚢🧊💔🎻🌊', answers: ['titanic'], category: '🎬 Phim ảnh' },
    { emojis: '🦖🦕🏞️🚙🥩', answers: ['jurassic park', 'jurassic world', 'công viên kỷ jura'], category: '🎬 Phim ảnh' },
    { emojis: '👽🚲🌕👆📡', answers: ['et', 'e.t.', 'e.t'], category: '🎬 Phim ảnh' },
    { emojis: '👻🚫👨‍🚒🔫🤢', answers: ['ghostbusters', 'biệt đội săn ma'], category: '🎬 Phim ảnh' },
    { emojis: '🔍🐠🤡🐟💙', answers: ['finding nemo', 'đi tìm nemo'], category: '🎬 Phim ảnh' },
    { emojis: '🐼🥋👊🥢🍜', answers: ['kung fu panda'], category: '🎬 Phim ảnh' },
    { emojis: '🍎👸🏰🧙‍♀️🍄', answers: ['snow white', 'bạch tuyết'], category: '🎬 Phim ảnh' },
    { emojis: '🧞‍♂️✨🐒🕌👳', answers: ['aladdin', 'aladin'], category: '🎬 Phim ảnh' },
    { emojis: '🚀🌌⚔️🤖👽', answers: ['star wars', 'chiến tranh giữa các vì sao'], category: '🎬 Phim ảnh' },
    { emojis: '💍🌋👣🧟‍♂️🏹', answers: ['lord of the rings', 'lotr', 'chúa tể những chiếc nhẫn'], category: '🎬 Phim ảnh' },
    { emojis: '🏴‍☠️🦜🚢💀⚔️', answers: ['pirates of the caribbean', 'cướp biển vùng caribbean'], category: '🎬 Phim ảnh' },
    { emojis: '🤠🧸🚀🥔🦖', answers: ['toy story', 'câu chuyện đồ chơi'], category: '🎬 Phim ảnh' },
    { emojis: '🍫🏭🎫🎩🍬', answers: ['charlie and the chocolate factory', 'willy wonka', 'nhà máy socola'], category: '🎬 Phim ảnh' },
    { emojis: '🤡🎈😱⛵☔', answers: ['it', 'gã hề ma quái'], category: '🎬 Phim ảnh' },
    { emojis: '🐀👨‍🍳🍲🗼🧀', answers: ['ratatouille', 'chú chuột đầu bếp'], category: '🎬 Phim ảnh' },
    { emojis: '🧠💭😄😢😡', answers: ['inside out', 'những mảnh ghép cảm xúc'], category: '🎬 Phim ảnh' },
    { emojis: '❄️👸⛄🦌🏰', answers: ['frozen', 'nữ hoàng băng giá'], category: '🎬 Phim ảnh' },
    { emojis: '🐉🏯👩‍🦰⚔️🦗', answers: ['mulan', 'mộc lan'], category: '🎬 Phim ảnh' },
    { emojis: '🧜‍♀️🌊🐚🔱🦀', answers: ['the little mermaid', 'little mermaid', 'nàng tiên cá'], category: '🎬 Phim ảnh' },
    { emojis: '🏹👸🐻🏞️🍪', answers: ['brave', 'công chúa tóc xù'], category: '🎬 Phim ảnh' },
    { emojis: '🎃👻🎅💀🎄', answers: ['the nightmare before christmas', 'nightmare before christmas'], category: '🎬 Phim ảnh' },
    { emojis: '🤖🌱🌍🚀❤️', answers: ['wall-e', 'wall e', 'walle'], category: '🎬 Phim ảnh' },
    { emojis: '👴🎈🏠☁️🐕', answers: ['up', 'vút bay'], category: '🎬 Phim ảnh' },
    { emojis: '🐟🔍💙🐙🐚', answers: ['finding dory', 'đi tìm dory'], category: '🎬 Phim ảnh' },
    { emojis: '🦈🌊😱⛵🩸', answers: ['jaws', 'hàm cá mập'], category: '🎬 Phim ảnh' },
    { emojis: '💀🌮🎸🕯️👵', answers: ['coco'], category: '🎬 Phim ảnh' },
    { emojis: '🤖👦🔫🔥🕶️', answers: ['terminator', 'the terminator', 'kẻ hủy diệt'], category: '🎬 Phim ảnh' },
    { emojis: '🧟‍♂️🌍🔫🏃‍♂️🏙️', answers: ['world war z'], category: '🎬 Phim ảnh' },
    { emojis: '🥊🏆🇮🇹🍖🏃', answers: ['rocky'], category: '🎬 Phim ảnh' },
    { emojis: '🦸‍♂️🔨⚡🌈🏰', answers: ['thor'], category: '🎬 Phim ảnh' },
    { emojis: '🕶️💊🤖🐇💻', answers: ['the matrix', 'matrix'], category: '🎬 Phim ảnh' },
    { emojis: '🚗⚡🔙⏰🌩️', answers: ['back to the future'], category: '🎬 Phim ảnh' },
    { emojis: '👩‍🚀🌌🕳️🌽🕰️', answers: ['interstellar'], category: '🎬 Phim ảnh' },
    { emojis: '🎭😈👼✝️🤮', answers: ['the exorcist', 'exorcist'], category: '🎬 Phim ảnh' },
    { emojis: '🐝🎬🤣🍯🌼', answers: ['bee movie'], category: '🎬 Phim ảnh' },
    { emojis: '🏠👦🪤🎄😲', answers: ['home alone', 'ở nhà một mình'], category: '🎬 Phim ảnh' },
    { emojis: '🧊🦥🐿️🐘❄️', answers: ['ice age', 'kỷ băng hà'], category: '🎬 Phim ảnh' },
    { emojis: '🐕🛷❄️🐺💉', answers: ['balto'], category: '🎬 Phim ảnh' },
    { emojis: '👸🐸💋🎺🐊', answers: ['the princess and the frog', 'princess and the frog'], category: '🎬 Phim ảnh' },
    { emojis: '🚗🏁💨🏆🛣️', answers: ['cars'], category: '🎬 Phim ảnh' },
    { emojis: '👨‍🦲💎🔫⚗️🚐', answers: ['breaking bad'], category: '📺 Phim bộ' },
    { emojis: '🧪👨‍🔬💀🍗👔', answers: ['breaking bad'], category: '📺 Phim bộ' },

    // ═══ TV Shows ═══
    { emojis: '👑🗡️🐉❄️🐺', answers: ['game of thrones', 'got', 'trò chơi vương quyền'], category: '📺 Phim bộ' },
    { emojis: '🧟‍♂️🔫🏚️🤠🚔', answers: ['the walking dead', 'walking dead', 'twd'], category: '📺 Phim bộ' },
    { emojis: '👨‍👩‍👧‍👦🏠😂🏡🏳️‍🌈', answers: ['modern family'], category: '📺 Phim bộ' },
    { emojis: '☕👫👫👫⛲🎬', answers: ['friends'], category: '📺 Phim bộ' },
    { emojis: '🏢📋😐📄🖇️', answers: ['the office', 'office'], category: '📺 Phim bộ' },
    { emojis: '🔬🤓🤓🤓🤓🍕', answers: ['the big bang theory', 'big bang theory'], category: '📺 Phim bộ' },
    { emojis: '👽🛸🔭🧒🔦🚲', answers: ['stranger things'], category: '📺 Phim bộ' },
    { emojis: '🏴‍☠️🧭🗺️👒🍖', answers: ['one piece'], category: '📺 Phim bộ' },
    { emojis: '🍊⬛🏢👯‍♀️🔐', answers: ['orange is the new black'], category: '📺 Phim bộ' },
    { emojis: '🏥👨‍⚕️💊🚑💔', answers: ['greys anatomy', "grey's anatomy", 'house', 'dr house'], category: '📺 Phim bộ' },
    { emojis: '🔎🎩🧥🎻🇬🇧', answers: ['sherlock'], category: '📺 Phim bộ' },
    { emojis: '💉🧛‍♂️🌙🩸📔', answers: ['vampire diaries', 'the vampire diaries'], category: '📺 Phim bộ' },
    { emojis: '🦸‍♂️🌆🦹‍♂️💊🍼', answers: ['the boys', 'boys'], category: '📺 Phim bộ' },
    { emojis: '🏫🎒👩‍🎓💀🎉', answers: ['elite'], category: '📺 Phim bộ' },

    // ═══ Songs / Music ═══
    { emojis: '🎵👶👶👶👱‍♀️🎳', answers: ['baby', 'baby by justin bieber'], category: '🎵 Bài hát' },
    { emojis: '🌧️☔😢💧🚗', answers: ['umbrella', 'singing in the rain'], category: '🎵 Bài hát' },
    { emojis: '🎤👸💍💃✋', answers: ['single ladies'], category: '🎵 Bài hát' },
    { emojis: '🌈🌧️👋👠🌪️', answers: ['somewhere over the rainbow', 'over the rainbow'], category: '🎵 Bài hát' },
    { emojis: '🎸🤘😈🔥🛣️', answers: ['highway to hell'], category: '🎵 Bài hát' },
    { emojis: '💃🕺🪩🎶👑', answers: ['dancing queen'], category: '🎵 Bài hát' },
    { emojis: '🎹🌙✨🎼🌃', answers: ['moonlight sonata', 'clair de lune'], category: '🎵 Bài hát' },
    { emojis: '👁️🐅🔥🥊🏃', answers: ['eye of the tiger'], category: '🎵 Bài hát' },
    { emojis: '💔😭🎤🎹📞', answers: ['someone like you', 'all by myself'], category: '🎵 Bài hát' },
    { emojis: '🦋✨🎶🌪️🏰', answers: ['butterfly', 'wings'], category: '🎵 Bài hát' },
    { emojis: '🌊🏄‍♂️☀️🏄‍♀️🏖️', answers: ['surfin usa', 'ocean eyes'], category: '🎵 Bài hát' },
    { emojis: '🔥🎤👩‍🎤💅🐦', answers: ['girl on fire'], category: '🎵 Bài hát' },
    { emojis: '💎🌌🎵✨🤩', answers: ['diamonds', 'lucy in the sky with diamonds'], category: '🎵 Bài hát' },

    // ═══ Food & Drink ═══
    { emojis: '🍕🇮🇹🧀🍅🌿', answers: ['pizza'], category: '🍽️ Đồ ăn' },
    { emojis: '🍔🍟🥤🤡🤖', answers: ['mcdonalds', "mcdonald's", 'burger', 'fast food'], category: '🍽️ Đồ ăn' },
    { emojis: '🍣🇯🇵🥢🍱🍙', answers: ['sushi'], category: '🍽️ Đồ ăn' },
    { emojis: '🌮🇲🇽🌶️🥙🥑', answers: ['taco', 'tacos', 'mexican food'], category: '🍽️ Đồ ăn' },
    { emojis: '🍝🇮🇹🧄🍞🍷', answers: ['pasta', 'spaghetti'], category: '🍽️ Đồ ăn' },
    { emojis: '🥐☕🇫🇷🗼🧈', answers: ['croissant', 'french breakfast'], category: '🍽️ Đồ ăn' },
    { emojis: '🍦🍫🍓🍨🥄', answers: ['ice cream', 'sundae'], category: '🍽️ Đồ ăn' },
    { emojis: '🧁🎂🎉🕯️🍰', answers: ['birthday cake', 'cake', 'cupcake'], category: '🍽️ Đồ ăn' },
    { emojis: '🥟🇨🇳🥢🍵🎋', answers: ['dumpling', 'dumplings', 'dim sum'], category: '🍽️ Đồ ăn' },
    { emojis: '🍜🍥🇯🇵🥢🥡', answers: ['ramen'], category: '🍽️ Đồ ăn' },
    { emojis: '🫕🧀🍷🍞🔥', answers: ['fondue', 'cheese fondue'], category: '🍽️ Đồ ăn' },
    { emojis: '☕🥛🧊🥤🧁', answers: ['iced coffee', 'iced latte', 'latte'], category: '🍽️ Đồ ăn' },

    // ═══ Animals ═══
    { emojis: '🖤⬜🐻🎋🇨🇳', answers: ['panda', 'giant panda'], category: '🐾 Động vật' },
    { emojis: '🦈🌊😬🦷🩸', answers: ['shark', 'great white shark'], category: '🐾 Động vật' },
    { emojis: '🐧❄️🇦🇶🥚👣', answers: ['penguin'], category: '🐾 Động vật' },
    { emojis: '🦁🌍🔥👑🥩', answers: ['lion'], category: '🐾 Động vật' },
    { emojis: '🦅🏔️🇺🇸🎣🦅', answers: ['bald eagle', 'eagle'], category: '🐾 Động vật' },
    { emojis: '🐙🌊🧠🦑🐚', answers: ['octopus'], category: '🐾 Động vật' },
    { emojis: '🦋🌸🌈🐛✨', answers: ['butterfly'], category: '🐾 Động vật' },
    { emojis: '🐺🌕🌲🐾🦷', answers: ['wolf'], category: '🐾 Động vật' },
    { emojis: '🐢🌊🐚🏖️🐢', answers: ['sea turtle', 'turtle'], category: '🐾 Động vật' },
    { emojis: '🦩🌴💕🍤🩰', answers: ['flamingo'], category: '🐾 Động vật' },
    { emojis: '🐋🌊💨🦐💧', answers: ['whale', 'blue whale'], category: '🐾 Động vật' },
    { emojis: '🦊❄️🌲🦴🧡', answers: ['fox', 'arctic fox'], category: '🐾 Động vật' },
    { emojis: '🐘🦒🦒🦒🌍', answers: ['elephant', 'safari'], category: '🐾 Động vật' },
    { emojis: '🐒🍌🌳🌿🙊', answers: ['monkey', 'chimpanzee'], category: '🐾 Động vật' },
    { emojis: '🐧❄️🧊🌊🐟', answers: ['penguin'], category: '🐾 Động vật' },
    { emojis: '🦁👑🌅🦒🐗', answers: ['lion'], category: '🐾 Động vật' },
    { emojis: '🦊💨🐾🌲🍄', answers: ['fox'], category: '🐾 Động vật' },
    { emojis: '🐻🐝🍯🌲🐟', answers: ['bear'], category: '🐾 Động vật' },
    { emojis: '🐰🥕🐾🧺🌳', answers: ['rabbit', 'bunny'], category: '🐾 Động vật' },
    { emojis: '🐍🌳🐀🍎🐍', answers: ['snake'], category: '🐾 Động vật' },
    { emojis: '🐅🟧⬛🍂', answers: ['tiger'], category: '🐾 Động vật' },
    { emojis: '🦉🌳🌙🐭🌲', answers: ['owl'], category: '🐾 Động vật' },
    { emojis: '🐨🌳🇦🇺🍃🐨', answers: ['koala'], category: '🐾 Động vật' },
    { emojis: '🦘🇦🇺🏜️', answers: ['kangaroo'], category: '🐾 Động vật' },
    { emojis: '🦥🌳🍃😴🌴', answers: ['sloth'], category: '🐾 Động vật' },
    { emojis: '🦒🦒🦒🌳🍃🌍', answers: ['giraffe'], category: '🐾 Động vật' },
    { emojis: '🦓🌾🦒🐘 África', answers: ['zebra'], category: '🐾 Động vật' },
    { emojis: '🦛🌊🌿泥', answers: ['hippo', 'hippopotamus'], category: '🐾 Động vật' },
    { emojis: '🦏🌾 África', answers: ['rhino', 'rhinoceros'], category: '🐾 Động vật' },
    { emojis: '🐼🎋🇨🇳🏔️', answers: ['panda', 'giant panda'], category: '🐾 Động vật' },
    { emojis: '🦩🌊💗🌾', answers: ['flamingo'], category: '🐾 Động vật' },
    { emojis: '🦚✨🌈🌳', answers: ['peacock'], category: '🐾 Động vật' },
    { emojis: '🐬🌊🛥️✨', answers: ['dolphin'], category: '🐾 Động vật' },
    { emojis: '🐋🌊🛥️🌬️', answers: ['whale'], category: '🐾 Động vật' },
    { emojis: '🦈🌊😱⛵🩸', answers: ['shark'], category: '🐾 Động vật' },
    { emojis: '🐙🌊🐚🦀', answers: ['octopus'], category: '🐾 Động vật' },
    { emojis: '🦀🌊🐚🏖️', answers: ['crab'], category: '🐾 Động vật' },
    { emojis: '🦞🌊🐚🍽️', answers: ['lobster'], category: '🐾 Động vật' },
    { emojis: '🪼🌊✨🌌', answers: ['jellyfish'], category: '🐾 Động vật' },
    { emojis: '🐢🌊🏖️🐚', answers: ['turtle'], category: '🐾 Động vật' },
    { emojis: '🐸🍃🌊🦗', answers: ['frog'], category: '🐾 Động vật' },
    { emojis: '🦋✨🌼🌳', answers: ['butterfly'], category: '🐾 Động vật' },
    { emojis: '🐝🍯🌼🌳', answers: ['bee'], category: '🐾 Động vật' },
    { emojis: '🐜🐜🍃🐜🌳', answers: ['ant'], category: '🐾 Động vật' },
    { emojis: '🕷️🕸️🏚️🕸️', answers: ['spider'], category: '🐾 Động vật' },
    { emojis: '🦂🏜️🏜️🦂', answers: ['scorpion'], category: '🐾 Động vật' },
    { emojis: '🦇🌙🏚️🧛‍♂️', answers: ['bat'], category: '🐾 Động vật' },
    { emojis: '🐺🌕🧥❄️', answers: ['wolf'], category: '🐾 Động vật' },
    { emojis: '🦌🌲🦌🍄', answers: ['deer'], category: '🐾 Động vật' },
    { emojis: '🦅🦅🏔️🌬️', answers: ['eagle'], category: '🐾 Động vật' },
    { emojis: '🐪🏜️🐫☀️', answers: ['camel'], category: '🐾 Động vật' },
    { emojis: '🦙🏔️🦙🇵🇪', answers: ['llama'], category: '🐾 Động vật' },

    // ═══ Countries ═══
    { emojis: '🗼🥖🧀🍷🎨', answers: ['france'], category: '🌍 Country' },
    { emojis: '🍕🏛️🤌🛵🍷', answers: ['italy'], category: '🌍 Country' },
    { emojis: '🗽🍔🇺🇸🦅⚾', answers: ['usa', 'united states', 'america'], category: '🌍 Country' },
    { emojis: '🗻🌸🍣🏯🍡', answers: ['japan'], category: '🌍 Country' },
    { emojis: '🦘🏖️🌏🐨🏄', answers: ['australia'], category: '🌍 Country' },
    { emojis: '🐉🏮🧧🥢🥟', answers: ['china'], category: '🌍 Country' },
    { emojis: '🌮🌵🎸👒🌶️', answers: ['mexico'], category: '🌍 Country' },
    { emojis: '☕🏏🕌🍛🎆', answers: ['india', 'turkey'], category: '🌍 Country' },
    { emojis: '🍀🍺🏰🧚‍♀️🎻', answers: ['ireland'], category: '🌍 Country' },
    { emojis: '⚽🎉🏖️💃🦜', answers: ['brazil'], category: '🌍 Country' },
    { emojis: '🏔️🧀🍫🕰️🎿', answers: ['switzerland'], category: '🌍 Country' },
    { emojis: '🐻❄️🏒🥞🍁', answers: ['russia', 'canada'], category: '🌍 Country' },
    { emojis: '🏺⚓🏖️🦉🍇', answers: ['greece'], category: '🌍 Country' },
    { emojis: '🌷🚲🧀👠🎨', answers: ['netherlands', 'holland'], category: '🌍 Country' },

    // ═══ Sports ═══
    { emojis: '⚽🏆🌍🥅📢', answers: ['world cup', 'football', 'soccer'], category: '⚽ Thể thao' },
    { emojis: '🏀🏆🇺🇸⛹️‍♂️👟', answers: ['nba', 'basketball'], category: '⚽ Thể thao' },
    { emojis: '🎾🏟️🍓🥛🇬🇧', answers: ['wimbledon', 'tennis'], category: '⚽ Thể thao' },
    { emojis: '🏈🏆🍗🏟️🎆', answers: ['super bowl', 'football', 'nfl'], category: '⚽ Thể thao' },
    { emojis: '🏊‍♂️🚴‍♂️🏃‍♂️🏅⏱️', answers: ['triathlon'], category: '⚽ Thể thao' },
    { emojis: '🥊🔔💪🦷🩸', answers: ['boxing'], category: '⚽ Thể thao' },
    { emojis: '⛷️🏔️❄️🎿🚠', answers: ['skiing'], category: '⚽ Thể thao' },
    { emojis: '🏒🥅🧊🧤❄️', answers: ['ice hockey', 'hockey'], category: '⚽ Thể thao' },
    { emojis: '🤸‍♀️🏅✨🩰💈', answers: ['gymnastics'], category: '⚽ Thể thao' },
    { emojis: '🏎️🏁💨🍾🚗', answers: ['formula 1', 'f1', 'racing'], category: '⚽ Thể thao' },
    { emojis: '⚽🥅🏟️👟🏃', answers: ['soccer', 'football', 'bóng đá'], category: '⚽ Thể thao' },
    { emojis: '🏀⛹️‍♂️🏀🏟️🏆', answers: ['basketball', 'bóng rổ'], category: '⚽ Thể thao' },
    { emojis: '🏈🏟️🍺🌭🧢', answers: ['american football', 'football'], category: '⚽ Thể thao' },
    { emojis: '⚾🏟️🧢🍿🌭', answers: ['baseball', 'bóng chày'], category: '⚽ Thể thao' },
    { emojis: '🥎🎾🏸🏓🏸', answers: ['tennis'], category: '⚽ Thể thao' },
    { emojis: '🏐🏖️🏐🏐🏐', answers: ['volleyball', 'bóng chuyền'], category: '⚽ Thể thao' },
    { emojis: '⛳🏌️‍♂️🏌️‍♀️🏌️🟢', answers: ['golf'], category: '⚽ Thể thao' },
    { emojis: '🏒❄️⛸️⛸️🥅', answers: ['hockey', 'ice hockey', 'khúc côn cầu'], category: '⚽ Thể thao' },
    { emojis: '🥊🥊👊🥊🥊', answers: ['boxing', 'quyền anh'], category: '⚽ Thể thao' },
    { emojis: '🥋🥋👊🥋🥋', answers: ['karate', 'judo', 'võ thuật'], category: '⚽ Thể thao' },
    { emojis: '🏊‍♂️🏊‍♀️💧🏊💧', answers: ['swimming', 'bơi lội'], category: '⚽ Thể thao' },
    { emojis: '🚴‍♂️🚴‍♀️🚵‍♂️🚴🚵', answers: ['cycling', 'đua xe đạp'], category: '⚽ Thể thao' },
    { emojis: '🏇🐎🏆🏇🐎', answers: ['horse racing', 'đua ngựa'], category: '⚽ Thể thao' },
    { emojis: '🏎️🏎️🏆🏁🏎️', answers: ['f1', 'formula 1', 'đua xe'], category: '⚽ Thể thao' },
    { emojis: '⛸️❄️⛸️⛸️✨', answers: ['skating', 'ice skating', 'trượt băng'], category: '⚽ Thể thao' },
    { emojis: '🏂❄️🏔️🏂🏔️', answers: ['snowboarding', 'trượt tuyết'], category: '⚽ Thể thao' },
    { emojis: '🎿❄️🏔️🎿🏔️', answers: ['skiing', 'trượt tuyết'], category: '⚽ Thể thao' },
    { emojis: '🏄‍♂️🏄‍♀️🌊🏄🏄', answers: ['surfing', 'lướt sóng'], category: '⚽ Thể thao' },
    { emojis: '🛶🌊🛶🛶🛶', answers: ['rowing', 'đua thuyền'], category: '⚽ Thể thao' },
    { emojis: '🏹🎯🏹🏹🏹', answers: ['archery', 'bắn cung'], category: '⚽ Thể thao' },

    // ═══ Video Games ═══
    { emojis: '🍄👨🏰🐢🌟', answers: ['mario', 'super mario'], category: '🎮 Game' },
    { emojis: '⛏️🟫🌲💎🧟', answers: ['minecraft'], category: '🎮 Game' },
    { emojis: '🐔🏠🏝️🍊🔔', answers: ['animal crossing'], category: '🎮 Game' },
    { emojis: '⚽🚗💥🏟️🚀', answers: ['rocket league'], category: '🎮 Game' },
    { emojis: '🔫🎯🏆🏗️🚌', answers: ['fortnite', 'call of duty', 'cod'], category: '🎮 Game' },
    { emojis: '🗡️🛡️🧝👸🔺', answers: ['zelda', 'the legend of zelda', 'legend of zelda'], category: '🎮 Game' },
    { emojis: '🟡⚫👻🍒💊', answers: ['pac-man', 'pacman', 'pac man'], category: '🎮 Game' },
    { emojis: '🐹⚡🔴🧢🎒', answers: ['pokemon', 'pikachu'], category: '🎮 Game' },
    { emojis: '🏰🐲👸🗡️🔥', answers: ['dragon quest', 'dark souls'], category: '🎮 Game' },
    { emojis: '🧱🟩🟦🟥🎼🇷🇺', answers: ['tetris'], category: '🎮 Game' },
    { emojis: '⬇️🔵🏃💍🦔', answers: ['sonic', 'sonic the hedgehog'], category: '🎮 Game' },
    { emojis: '🏗️🌆👷🌪️📉', answers: ['sim city', 'simcity', 'cities skylines'], category: '🎮 Game' },
    { emojis: '🧟🔫🌿🌻🧠', answers: ['plants vs zombies', 'pvz', 'resident evil'], category: '🎮 Game' },

    // ═══ Brands ═══
    { emojis: '🍎📱💻⌚🖥️', answers: ['apple'], category: '🏢 Brand' },
    { emojis: '☕🧜‍♀️💚🥤🥐', answers: ['starbucks'], category: '🏢 Brand' },
    { emojis: '👟✔️🏃⛹️‍♂️👕', answers: ['nike'], category: '🏢 Brand' },
    { emojis: '🎬🍿🟥🎞️📺', answers: ['netflix'], category: '🏢 Brand' },
    { emojis: '🔍🌐💻🗺️📧', answers: ['google'], category: '🏢 Brand' },
    { emojis: '📦😊🚚🛒☁️', answers: ['amazon'], category: '🏢 Brand' },
    { emojis: '🐦💙📱💬📢', answers: ['twitter', 'x'], category: '🏢 Brand' },
    { emojis: '📸💜🖼️🤳❤️', answers: ['instagram'], category: '🏢 Brand' },
    { emojis: '🎮🟦💿📺🕸️', answers: ['playstation', 'ps5', 'sony'], category: '🏢 Brand' },
    { emojis: '🟢🎮🕹️❎🇺🇸', answers: ['xbox', 'microsoft'], category: '🏢 Brand' },

    // ═══ Famous People ═══
    { emojis: '🎤👑💃🐝🤰', answers: ['beyonce'], category: '⭐ Celebrity' },
    { emojis: '🏀👑🐐👟🗑️', answers: ['lebron james', 'lebron', 'michael jordan', 'jordan'], category: '⭐ Celebrity' },
    { emojis: '🎸👑🟣🌧️🏍️', answers: ['prince'], category: '⭐ Celebrity' },
    { emojis: '🚀🔴🌌🚙🐦', answers: ['elon musk', 'elon'], category: '⭐ Celebrity' },
    { emojis: '🎤🦢👗🎸💔', answers: ['taylor swift', 'taylor'], category: '⭐ Celebrity' },
    { emojis: '⚽🐐🇦🇷🔟👕', answers: ['messi', 'lionel messi'], category: '⭐ Celebrity' },
    { emojis: '⚽🇵🇹💪🏆🕶️', answers: ['ronaldo', 'cristiano ronaldo', 'cr7'], category: '⭐ Celebrity' },

    // ═══ Fairy Tales / Stories ═══
    { emojis: '🐺🏠🐷🐷🐷🧱', answers: ['three little pigs', '3 little pigs'], category: '📖 Story' },
    { emojis: '👧🐻🥣🛏️👱‍♀️', answers: ['goldilocks', 'goldilocks and the three bears'], category: '📖 Story' },
    { emojis: '🐸👑💋👸💚', answers: ['the frog prince', 'frog prince'], category: '📖 Story' },
    { emojis: '👧🌹🐺👵🍲', answers: ['little red riding hood', 'red riding hood'], category: '📖 Story' },
    { emojis: '🧒🌱🏰☁️🦢', answers: ['jack and the beanstalk'], category: '📖 Story' },
    { emojis: '🧑‍🦯👃📏🐋🤥', answers: ['pinocchio'], category: '📖 Story' },
    { emojis: '🦢👸💔🩰湖', answers: ['swan lake', 'the ugly duckling', 'ugly duckling'], category: '📖 Story' },

    // ═══ Concepts / Phrases ═══
    { emojis: '💔🌧️😢🩹🛌', answers: ['heartbreak', 'sadness', 'broken heart'], category: '💡 Concept' },
    { emojis: '🌍✌️🕊️🤝☮️', answers: ['world peace', 'peace'], category: '💡 Concept' },
    { emojis: '⏰💰💵🏃‍♂️⏳', answers: ['time is money'], category: '💡 Concept' },
    { emojis: '🐘🏠🤫👀🛋️', answers: ['elephant in the room'], category: '💡 Concept' },
    { emojis: '🧊🏔️🔝🚢🌊', answers: ['tip of the iceberg'], category: '💡 Concept' },
    { emojis: '🌈🦄✨🧚‍♀️🏰', answers: ['fantasy', 'fairytale', 'magic', 'unicorn'], category: '💡 Concept' },
    { emojis: '🔥👖👖👺🤥', answers: ['liar liar pants on fire', 'liar'], category: '💡 Concept' },
    { emojis: '💡🧠💪📚🎓', answers: ['knowledge is power', 'big brain'], category: '💡 Concept' },
    { emojis: '🍏🍎⚖️🍊📏', answers: ['apples and oranges', 'comparison'], category: '💡 Concept' },
    { emojis: '🐑🐑🐑💤🌙', answers: ['counting sheep', 'insomnia', 'sleep'], category: '💡 Concept' },
    { emojis: '🌪️🧙‍♀️🏠👠🦁', answers: ['wizard of oz', 'the wizard of oz'], category: '🎬 Movie' },

    // ═══ More Movies ═══
    { emojis: '🦸‍♂️🛡️⭐🇺🇸🏋️‍♂️', answers: ['captain america'], category: '🎬 Phim ảnh' },
    { emojis: '🕷️🕸️🌌🐖🎨', answers: ['spider verse', 'into the spider verse', 'across the spider verse'], category: '🎬 Phim ảnh' },
    { emojis: '🤖❤️🌱🚀👢', answers: ['wall-e', 'walle', 'wall e'], category: '🎬 Phim ảnh' },
    { emojis: '🦸‍♂️🟢💪🧪🩳', answers: ['hulk', 'the incredible hulk'], category: '🎬 Phim ảnh' },
    { emojis: '🐝🎥🍯👩‍⚖️🌼', answers: ['bee movie'], category: '🎬 Phim ảnh' },
    { emojis: '👨‍🚀🌙🚀🇺🇸⛳', answers: ['apollo 13', 'first man', 'moon'], category: '🎬 Phim ảnh' },
    { emojis: '🧛‍♂️🌙💉🐺🔮', answers: ['dracula', 'twilight'], category: '🎬 Phim ảnh' },
    { emojis: '🦍🏙️👸✈️🗼', answers: ['king kong'], category: '🎬 Phim ảnh' },
    { emojis: '🐊🏊‍♂️😱🏠🌧️', answers: ['crawl', 'lake placid'], category: '🎬 Phim ảnh' },
    { emojis: '🎩🐇✨🃏🎭', answers: ['the prestige', 'now you see me'], category: '🎬 Phim ảnh' },
    { emojis: '👨‍👩‍👧‍👦🏠🐕🐾🎾', answers: ['marley and me', 'beethoven'], category: '🎬 Phim ảnh' },
    { emojis: '🌊🏄‍♂️🦈👙🏖️', answers: ['soul surfer', 'the shallows'], category: '🎬 Phim ảnh' },
    { emojis: '🤖🚗🔫🚚🐝', answers: ['transformers'], category: '🎬 Phim ảnh' },
    { emojis: '👸👠⏰🎃🐁', answers: ['cinderella'], category: '🎬 Phim ảnh' },
    { emojis: '🧔🔪🏨🛀👯‍♀️', answers: ['the shining', 'psycho'], category: '🎬 Phim ảnh' },
    { emojis: '🏜️🪱🌌👂🕌', answers: ['dune'], category: '🎬 Phim ảnh' },
    { emojis: '🐕‍🦺🧑‍🦯❤️🚆🍫', answers: ['a dogs purpose', 'hachi', 'hachiko'], category: '🎬 Phim ảnh' },
    { emojis: '👨‍🍳🐀🇫🇷🍜🥕', answers: ['ratatouille'], category: '🎬 Phim ảnh' },
    { emojis: '🏰🧙‍♀️🐈‍⬛🧹🎀', answers: ['kiki', "kiki's delivery service", 'howls moving castle'], category: '🎬 Phim ảnh' },
    { emojis: '🌸🏯⚔️🇯🇵🥋', answers: ['the last samurai', 'last samurai', 'memoirs of a geisha'], category: '🎬 Phim ảnh' },

    // ═══ Anime ═══
    { emojis: '🍊👒🏴‍☠️🍖⚓', answers: ['one piece', 'luffy'], category: '🎌 Anime' },
    { emojis: '🦊🍥🥷🌀🍜', answers: ['naruto'], category: '🎌 Anime' },
    { emojis: '⚔️👹🌊👺🎋', answers: ['demon slayer', 'kimetsu no yaiba'], category: '🎌 Anime' },
    { emojis: '🐉🟠7️⃣☁️🐒', answers: ['dragon ball', 'dragon ball z', 'dbz'], category: '🎌 Anime' },
    { emojis: '💀📓✍️🍎🚔', answers: ['death note'], category: '🎌 Anime' },
    { emojis: '👊🦸‍♂️💥🥚🛍️', answers: ['one punch man'], category: '🎌 Anime' },
    { emojis: '⚔️🏰👑🗝️🤕', answers: ['attack on titan', 'aot'], category: '🎌 Anime' },
    { emojis: '🏀🔵🔴⛹️‍♂️🏫', answers: ['kuroko no basket', 'slam dunk'], category: '🎌 Anime' },
    { emojis: '👻🎮🏠♟️🎲', answers: ['no game no life'], category: '🎌 Anime' },
    { emojis: '🧙‍♂️✨🏫🔥🐉', answers: ['fairy tail', 'jujutsu kaisen', 'jjk'], category: '🎌 Anime' },
    { emojis: '🤖👦🔧💍👁️', answers: ['fullmetal alchemist', 'fma'], category: '🎌 Anime' },
    { emojis: '🏐🏫🏆🐦🍊', answers: ['haikyuu', 'haikyu'], category: '🎌 Anime' },
    { emojis: '👹🎭🌸☕👽', answers: ['demon slayer', 'tokyo ghoul'], category: '🎌 Anime' },
    { emojis: '🗡️🎮🌐💏🏰', answers: ['sword art online', 'sao'], category: '🎌 Anime' },
    { emojis: '🏴‍☠️⛵🗺️🧭💀', answers: ['one piece'], category: '🎌 Anime' },
    { emojis: '🔮👁️🐍🐸📝', answers: ['naruto', 'orochimaru', 'sasuke'], category: '🎌 Anime' },

    // ═══ Landmarks ═══
    { emojis: '🗼🇫🇷💡🥐🥖', answers: ['eiffel tower'], category: '🏛️ Địa danh nổi tiếng' },
    { emojis: '🗽🇺🇸🏝️🏙️🎆', answers: ['statue of liberty'], category: '🏛️ Địa danh nổi tiếng' },
    { emojis: '🏯🌸🇯🇵🏯🍵', answers: ['japanese castle', 'temple', 'kyoto'], category: '🏛️ Địa danh nổi tiếng' },
    { emojis: '🧱🐉🇨🇳🏔️🏰', answers: ['great wall of china', 'great wall'], category: '🏛️ Địa danh nổi tiếng' },
    { emojis: '🏛️🇬🇷☀️🏺🦉', answers: ['parthenon', 'acropolis'], category: '🏛️ Địa danh nổi tiếng' },
    { emojis: '🕌🇮🇳💎👸💭', answers: ['taj mahal'], category: '🏛️ Địa danh nổi tiếng' },
    { emojis: '🗿🏝️😶🗿🐦', answers: ['easter island', 'moai'], category: '🏛️ Địa danh nổi tiếng' },
    { emojis: '🎡🇬🇧🌉🕰️🚌', answers: ['london eye', 'big ben', 'tower bridge'], category: '🏛️ Địa danh nổi tiếng' },
    { emojis: '🏔️🧊🇳🇵🐂🏕️', answers: ['mount everest', 'everest'], category: '🏛️ Địa danh nổi tiếng' },
    { emojis: '🌋🏝️🌊🌺🍍', answers: ['hawaii', 'volcano', 'mount fuji'], category: '🏛️ Địa danh nổi tiếng' },
    { emojis: '🎰🌃💰🎲🃏', answers: ['las vegas', 'vegas'], category: '🏛️ Địa danh nổi tiếng' },
    { emojis: '🏟️⚔️🇮🇹🛡️🦁', answers: ['colosseum', 'coliseum'], category: '🏛️ Địa danh nổi tiếng' },

    // ═══ Occupations ═══
    { emojis: '👨‍🚒🔥🚒💦🪓', answers: ['firefighter', 'fireman'], category: '👔 Job' },
    { emojis: '👨‍🍳🔪🍽️🥘🧂', answers: ['chef', 'cook'], category: '👔 Job' },
    { emojis: '👩‍⚕️💉🏥🚑🩺', answers: ['doctor', 'nurse'], category: '👔 Job' },
    { emojis: '👨‍🚀🚀🌌🛰️👽', answers: ['astronaut'], category: '👔 Job' },
    { emojis: '👩‍🏫📚🏫📝🍎', answers: ['teacher', 'professor'], category: '👔 Job' },
    { emojis: '👨‍✈️✈️☁️🛫🛬', answers: ['pilot'], category: '👔 Job' },
    { emojis: '🕵️‍♂️🔍📋👣🔦', answers: ['detective', 'investigator'], category: '👔 Job' },
    { emojis: '👨‍🌾🌾🚜🐮🌽', answers: ['farmer'], category: '👔 Job' },
    { emojis: '👩‍🎤🎤🎵🎸🥁', answers: ['singer', 'musician'], category: '👔 Job' },
    { emojis: '👨‍💻💻☕⌨️🖱️', answers: ['programmer', 'developer', 'coder', 'software engineer'], category: '👔 Job' },

    // ═══ Emotions / Feelings ═══
    { emojis: '😍🦋🥰💌🍫', answers: ['love', 'in love', 'butterflies'], category: '😊 Emotion' },
    { emojis: '😱👻🌑🫣🕯️', answers: ['fear', 'scared', 'horror', 'terrified'], category: '😊 Emotion' },
    { emojis: '🤩⭐🎆🎉🎈', answers: ['excitement', 'excited', 'amazed'], category: '😊 Emotion' },
    { emojis: '😤💢🌋🤬🥊', answers: ['anger', 'angry', 'rage', 'furious'], category: '😊 Emotion' },
    { emojis: '😴💤🛏️🌙🥱', answers: ['sleepy', 'tired', 'exhausted', 'sleep'], category: '😊 Emotion' },
    { emojis: '🥺😢💧🌧️🥀', answers: ['sad', 'sadness', 'crying'], category: '😊 Emotion' },
    { emojis: '🤔💭❓🧐🔍', answers: ['confused', 'thinking', 'curiosity', 'curious'], category: '😊 Emotion' },
    { emojis: '😎🕶️💪🏆✨', answers: ['confident', 'cool', 'confidence'], category: '😊 Emotion' },

    // ═══ Superheroes ═══
    { emojis: '🦸‍♂️🔴🔵⭐🛡️🫡', answers: ['captain america'], category: '🦸 Superhero' },
    { emojis: '🕷️👦🏙️🕸️🛹', answers: ['spiderman', 'spider-man', 'spider man'], category: '🦸 Superhero' },
    { emojis: '🦇🌑🏙️🚙🃏', answers: ['batman', 'the dark knight', 'dark knight'], category: '🦸 Superhero' },
    { emojis: '🔨⚡👑🍺🧔', answers: ['thor'], category: '🦸 Superhero' },
    { emojis: '💚👊😡🧪👖', answers: ['hulk', 'the hulk'], category: '🦸 Superhero' },
    { emojis: '🏹💜👁️🎯👨‍👩‍👧‍👦', answers: ['hawkeye'], category: '🦸 Superhero' },
    { emojis: '🦸‍♀️👑🌟🛡️🗡️', answers: ['wonder woman'], category: '🦸 Superhero' },
    { emojis: '⚡🏃‍♂️🔴🌭⚡', answers: ['the flash', 'flash'], category: '🦸 Superhero' },
    { emojis: '🕶️💎🤖🏎️🍔', answers: ['iron man', 'tony stark'], category: '🦸 Superhero' },
    { emojis: '🐈‍⬛👩💎🏍️🥛', answers: ['catwoman', 'black cat', 'black widow'], category: '🦸 Superhero' },
    { emojis: '🕸️🦹‍♂️🟢🎃💣', answers: ['green goblin', 'green lantern'], category: '🦸 Superhero' },
    { emojis: '🧲🔴🟣🔧🧠', answers: ['magneto'], category: '🦸 Superhero' },

    // ═══ More TV Shows ═══
    { emojis: '🧪💊👨‍🔬🏜️💎', answers: ['breaking bad'], category: '📺 TV Show' },
    { emojis: '👽🔬🏢🛸🔦', answers: ['the x files', 'x files'], category: '📺 TV Show' },
    { emojis: '🏝️✈️💀🔒🐻‍❄️', answers: ['lost'], category: '📺 TV Show' },
    { emojis: '🧊🔥👑⚔️🐉', answers: ['game of thrones', 'got'], category: '📺 TV Show' },
    { emojis: '🎤💃🌟🥤🏫', answers: ['glee', 'american idol'], category: '📺 TV Show' },
    { emojis: '💰🏠🏦💸🔫', answers: ['money heist', 'la casa de papel'], category: '📺 TV Show' },
    { emojis: '♟️👑🤴💊🥃', answers: ['the queens gambit', "queen's gambit"], category: '📺 TV Show' },
    { emojis: '🐴🍺🎭😿🏊‍♂️', answers: ['bojack horseman'], category: '📺 TV Show' },
    { emojis: '👨‍👩‍👧‍👦🟡🍩🛋️📺', answers: ['the simpsons', 'simpsons'], category: '📺 TV Show' },
    { emojis: '🧽⭐🍍🏠🍔', answers: ['spongebob', 'spongebob squarepants'], category: '📺 TV Show' },
    { emojis: '👦🐕⏰🌈🏰', answers: ['adventure time'], category: '📺 TV Show' },
    { emojis: '🧪👧👧👧🎀🐒', answers: ['powerpuff girls', 'the powerpuff girls'], category: '📺 TV Show' },

    // ═══ More Songs ═══
    { emojis: '🎵🌍👫🤝🕊️', answers: ['we are the world'], category: '🎵 Song' },
    { emojis: '🔔🎄🎅🛷🦌', answers: ['jingle bells'], category: '🎵 Song' },
    { emojis: '🌠✨🎵🌌👀', answers: ['twinkle twinkle little star', 'twinkle twinkle', 'shooting star'], category: '🎵 Song' },
    { emojis: '🎤🎶😭💔📞', answers: ['hello', 'someone like you', 'rolling in the deep'], category: '🎵 Song' },
    { emojis: '🏃‍♂️🌧️☔🎬🧥', answers: ['singing in the rain'], category: '🎵 Song' },
    { emojis: '🌊🎵😮👀💙', answers: ['ocean', 'ocean eyes', 'under the sea'], category: '🎵 Song' },
    { emojis: '🔥🎵🕺💃🕺', answers: ['hot stuff', 'burn', 'fire'], category: '🎵 Song' },
    { emojis: '🎸🎤👨‍🎤🤘🥁', answers: ['rock and roll', 'rock n roll', 'we will rock you'], category: '🎵 Song' },

    // ═══ More Video Games ═══
    { emojis: '🏰👸🍄🔥🎹', answers: ['super mario', 'mario bros'], category: '🎮 Game' },
    { emojis: '🐔🔫🪂🏞️🍽️', answers: ['pubg', 'fortnite', 'free fire'], category: '🎮 Game' },
    { emojis: '⚡🟡🔴⚫🐭', answers: ['pokemon'], category: '🎮 Game' },
    { emojis: '🧱🏠🎨👷‍♂️🤖', answers: ['roblox', 'lego'], category: '🎮 Game' },
    { emojis: '🗡️🧝‍♂️🏹🐴🕰️', answers: ['zelda', 'breath of the wild', 'tears of the kingdom'], category: '🎮 Game' },
    { emojis: '🏎️🍌🏆🐢🎈', answers: ['mario kart'], category: '🎮 Game' },
    { emojis: '🌾🐄🏡🐔🌽', answers: ['stardew valley', 'harvest moon', 'farmville'], category: '🎮 Game' },
    { emojis: '🧩🔵🟠🔴🤫🔪', answers: ['among us', 'fall guys'], category: '🎮 Game' },
    { emojis: '🐉🗡️🛡️🙀⛰️', answers: ['skyrim', 'dragon age', 'elden ring'], category: '🎮 Game' },
    { emojis: '🔫👮‍♂️🚗🚁💰', answers: ['gta', 'grand theft auto'], category: '🎮 Game' },

    // ═══ More Countries ═══
    { emojis: '🥖🧈🍷🇫🇷🗼', answers: ['france'], category: '🌍 Country' },
    { emojis: '🐨🏖️🦘🏄‍♂️🏜️', answers: ['australia'], category: '🌍 Country' },
    { emojis: '🎎🍵🗻🌸👘', answers: ['japan'], category: '🌍 Country' },
    { emojis: '🍁🏒🦫🥞⛷️', answers: ['canada'], category: '🌍 Country' },
    { emojis: '🐘🍛🏏🛺🕉️', answers: ['india', 'sri lanka'], category: '🌍 Country' },
    { emojis: '🏔️🧘‍♂️🙏🚩🪙', answers: ['nepal', 'tibet'], category: '🌍 Country' },
    { emojis: '🐪🏜️🕌🏺☀️', answers: ['egypt', 'saudi arabia', 'dubai'], category: '🌍 Country' },
    { emojis: '🎭🥐🧀🍷🎨', answers: ['france'], category: '🌍 Country' },
    { emojis: '🍺🌭🏰🥨⚽', answers: ['germany'], category: '🌍 Country' },
    { emojis: '🐂🏖️🍹🍅💃', answers: ['spain'], category: '🌍 Country' },
    { emojis: '🎋🐼🥟🍜🧧', answers: ['china'], category: '🌍 Country' },
    { emojis: '🥝🐑🏔️🏉🏞️', answers: ['new zealand'], category: '🌍 Country' },

    // ═══ Holidays ═══
    { emojis: '🎄🎅🎁🦌⛄', answers: ['christmas'], category: '🎊 Holiday' },
    { emojis: '🎃👻🍬🧛‍♂️🧟', answers: ['halloween'], category: '🎊 Holiday' },
    { emojis: '🐣🐰🥚🍫🧺', answers: ['easter'], category: '🎊 Holiday' },
    { emojis: '❤️💘🌹💌🧸', answers: ['valentines day', "valentine's day", 'valentines'], category: '🎊 Holiday' },
    { emojis: '🦃🍁🥧🌽🥔', answers: ['thanksgiving'], category: '🎊 Holiday' },
    { emojis: '🎆🎇🥂🕛🎉', answers: ['new years', "new year's", 'new year', 'new years eve'], category: '🎊 Holiday' },
    { emojis: '☘️🟢🍺🌈💰', answers: ['st patricks day', "saint patrick's day", 'st paddys day'], category: '🎊 Holiday' },
    { emojis: '🕎🕯️✡️🍩🎲', answers: ['hanukkah', 'chanukah'], category: '🎊 Holiday' },

    // ═══ Science ═══
    { emojis: '🌍🌡️🔥📉🧊', answers: ['global warming', 'climate change'], category: '🔬 Science' },
    { emojis: '🧬🔬👨‍🔬🧫🧪', answers: ['dna', 'genetics', 'biology'], category: '🔬 Science' },
    { emojis: '⚛️💥🔬☢️💣', answers: ['nuclear', 'atom', 'physics'], category: '🔬 Science' },
    { emojis: '🌌🔭⭐🪐👽', answers: ['astronomy', 'stargazing'], category: '🔬 Science' },
    { emojis: '🦠😷💉🧬📉', answers: ['pandemic', 'covid', 'virus', 'vaccination'], category: '🔬 Science' },
    { emojis: '🧲⚡🔋🔌💡', answers: ['electricity', 'magnetism', 'energy'], category: '🔬 Science' },
    { emojis: '🌋🌍💨🔥🏔️', answers: ['volcano', 'eruption'], category: '🔬 Science' },
    { emojis: '🪐🌌🛸👽🌠', answers: ['space', 'universe', 'galaxy'], category: '🔬 Science' },

    // ═══ More Brands ═══
    { emojis: '🎵🟢📱🎧📻', answers: ['spotify'], category: '🏢 Brand' },
    { emojis: '📺🔴▶️📹👀', answers: ['youtube'], category: '🏢 Brand' },
    { emojis: '🎮🟩🕹️🔫🏎️', answers: ['xbox'], category: '🏢 Brand' },
    { emojis: '🍟🤡🟡🔴🍔', answers: ['mcdonalds', "mcdonald's"], category: '🏢 Brand' },
    { emojis: '👻📸💛🤳👯', answers: ['snapchat'], category: '🏢 Brand' },
    { emojis: '🎵🎬📱💃📉', answers: ['tiktok', 'tik tok'], category: '🏢 Brand' },
    { emojis: '💬🟣📱🎮👥', answers: ['discord'], category: '🏢 Brand' },
    { emojis: '🚗⚡🔋🚀🌌', answers: ['tesla'], category: '🏢 Brand' },
    { emojis: '👑🍔🔥🤴🍖', answers: ['burger king'], category: '🏢 Brand' },
    { emojis: '🐦🔵✈️💬📱', answers: ['twitter', 'telegram'], category: '🏢 Brand' },

    // ═══ More Food ═══
    { emojis: '🥞🍁🧈🥓🥚', answers: ['pancakes', 'pancake'], category: '🍽️ Food' },
    { emojis: '🌯🥑🫘🌮🌶️', answers: ['burrito'], category: '🍽️ Food' },
    { emojis: '🍩☕🍫🚔🥯', answers: ['donut', 'doughnut'], category: '🍽️ Food' },
    { emojis: '🥗🥒🍅🥕🥬', answers: ['salad'], category: '🍽️ Food' },
    { emojis: '🧇🍓🍯🍴🧇', answers: ['waffle', 'waffles'], category: '🍽️ Food' },
    { emojis: '🍿🎬🧂🥤🧈', answers: ['popcorn'], category: '🍽️ Food' },
    { emojis: '🫖🍵🇬🇧🧁🥪', answers: ['tea', 'english tea', 'afternoon tea'], category: '🍽️ Food' },
    { emojis: '🥐🍫☕🥓🍳', answers: ['breakfast', 'brunch'], category: '🍽️ Food' },

    // ═══ New Additions ═══
    { emojis: '🧛‍♂️🦇🏰⚰️🩸', answers: ['dracula', 'vampire'], category: '🎬 Movie' },
    { emojis: '👻👨‍🔬🔫🚫 marshmallow', answers: ['ghostbusters'], category: '🎬 Movie' },
    { emojis: '🦖🌴🚙🦴🦕', answers: ['jurassic park'], category: '🎬 Movie' },
    { emojis: '🍫🏭👦🎫🍭', answers: ['charlie and the chocolate factory', 'willy wonka'], category: '🎬 Movie' },
    { emojis: '🚢🧊💑🌊🚪', answers: ['titanic'], category: '🎬 Movie' },
    { emojis: '🧙‍♂️💍🌋👁️🦅', answers: ['lord of the rings'], category: '🎬 Movie' },
    { emojis: '🦁👑🐗🐒🌅', answers: ['the lion king', 'lion king'], category: '🎬 Movie' },
    { emojis: '🤡🎈🛀⛵☔', answers: ['it'], category: '🎬 Movie' },
    { emojis: '🤖🕶️💊🐇📞', answers: ['the matrix', 'matrix'], category: '🎬 Movie' },
    { emojis: '🧟‍♂️🧟‍♀️🔫🏚️🧠', answers: ['walking dead', 'zombieland'], category: '📺 TV Show' },
    { emojis: '🧪💎🚐🕶️🍗', answers: ['breaking bad'], category: '📺 TV Show' },
    { emojis: '🦑🎮💰🎭🐖', answers: ['squid game'], category: '📺 TV Show' },
    { emojis: '🧇👧🧠👃🚲', answers: ['stranger things'], category: '📺 TV Show' },
    { emojis: '🏰🐉🐺❄️⚔️', answers: ['game of thrones'], category: '📺 TV Show' },
    { emojis: '🎸🎩🌹🚬🥃', answers: ['slash', 'guns n roses'], category: '⭐ Celebrity' },
    { emojis: '🕴️🔫🍸👙🏎️', answers: ['james bond', '007'], category: '🎬 Movie' },
    { emojis: '🕷️🕸️🤟📷🐜', answers: ['spiderman'], category: '🦸 Superhero' },
    { emojis: '🦇🃏🤡🦇🔦', answers: ['batman'], category: '🦸 Superhero' },
    { emojis: '⚡🌩️🔨💪🍺', answers: ['thor'], category: '🦸 Superhero' },
    { emojis: '🟢💪😡🧪🩳', answers: ['hulk'], category: '🦸 Superhero' },
    { emojis: '🇺🇸🛡️⭐🫡🏍️', answers: ['captain america'], category: '🦸 Superhero' },
    { emojis: '🤖🔴🌗🕴️💰', answers: ['iron man'], category: '🦸 Superhero' }
];

module.exports = {
    name: 'emojiquiz',
    aliases: ['quiz', 'eq'],
    description: 'Guess the phrase from emojis!',
    cooldown: 10,
    manualCooldown: true,
    async execute(message, args) {
        const lang = await getLanguage(message.author.id);
        const q = EMOJI_QUIZ[Math.floor(Math.random() * EMOJI_QUIZ.length)];
        const displayAnswer = q.answers[0].replace(/\b\w/g, c => c.toUpperCase()); // Title Case

        // Generate Hint: Match words and replace non-first letters with underscores
        const hint = displayAnswer.replace(/[a-zA-Z0-9]/g, (char, index) => {
            if (index === 0 || displayAnswer[index - 1] === ' ') return char;
            return '\\_';
        });

        const embed = new EmbedBuilder()
            .setTitle(t('emojiquiz.title', lang))
            .setDescription(`**${q.category}** — ${t('emojiquiz.question', lang, { emojis: `\n\n# ${q.emojis}` })}\n\n💡 **Hint:** \`${hint}\``)
            .setColor(0xE67E22)
            .setFooter({ text: t('emojiquiz.footer', lang) });

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

            const winnerMsg = collected.first();
            const baseReward = config.ECONOMY.EMOJIQUIZ_REWARD;
            const multiplier = getUserMultiplier(winnerMsg.author.id, 'income');
            const bonus = Math.floor(baseReward * multiplier);
            const totalReward = baseReward + bonus;

            db.addBalance(winnerMsg.author.id, totalReward);

            let resultDesc = t('emojiquiz.correct', lang, { answer: displayAnswer, winner: winnerMsg.author.toString() }) +
                t('emojiquiz.reward', lang, { emoji: config.EMOJIS.COIN, amount: baseReward });

            if (bonus > 0) resultDesc += `\n✨ **Item Bonus:** +${bonus} (${Math.round(multiplier * 100)}%)`;

            await winnerMsg.reply({
                embeds: [new EmbedBuilder()
                    .setTitle(t('common.success', lang))
                    .setDescription(resultDesc)
                    .setColor(config.COLORS.SUCCESS)]
            });
            startCooldown(message.client, 'emojiquiz', message.author.id);
        } catch {
            await message.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle(t('emojiquiz.incorrect', lang).replace('✅', '⌛')) // Reusing or just using text
                    .setDescription(t('emojiquiz.timeout', lang, { answer: displayAnswer }))
                    .setColor(config.COLORS.ERROR)]
            });
            startCooldown(message.client, 'emojiquiz', message.author.id);
        }
    }
};
