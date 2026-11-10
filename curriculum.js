'use strict';

// Correct answer first in the source. Every sitting shuffles the printed choices.
const courses = [
  {
    id: 'equine', number: '01', title: 'Horse Anatomy', accent: '#e2b47a',
    intro: 'The proctor stands in the hall. A chain catches the light beside his left eye.',
    shift: 'The clock stops for a beat. Something with hooves answers it.',
    study: 'Poll: behind the ears. Withers: over the shoulders. Croup: top of the rump. Dock: base of the tail. Foreleg knee: carpus. Hind-leg hock: tarsus. The pastern is below the fetlock. The stifle is higher than the hock. Find the frog on the hoof’s underside and the coronary band above its wall. Fiber ferments in the cecum and large colon, after the small intestine.',
    threat: {name:'The Hollow Mare',view:'front',tell:'HALL · A hoof drags against tile.',action:'Keep your eyes on it',hold:1.35,pan:0,method:'watch',hit:'The Hollow Mare reached your desk.'},
    practical: {id:'ward',view:'front',title:'The Three Shoes',brief:'Watch the horseshoes light up. Repeat each pattern on the same shoes.',goal:2,buttons:['1','2','3']},
    questions: [
      ['Where would you fit a strap over the poll?', 'Just behind the ears', 'At the base of the tail', 'Across the chest', 'Under the jaw'],
      ['The saddle slides forward. Which ridge lies above the shoulders?', 'Withers', 'Croup', 'Loin', 'Dock'],
      ['Which landmark is the bony base of the tail?', 'Dock', 'Crest', 'Pastern', 'Muzzle'],
      ['Which word labels the top of the hindquarters?', 'Croup', 'Flank', 'Barrel', 'Poll'],
      ['The chart marks the foreleg “knee.” Which joint is that?', 'Carpus', 'Tarsus', 'Stifle', 'Elbow'],
      ['A radiograph shows the tarsus. What is its common name?', 'Hock', 'Fetlock', 'Knee', 'Coronet'],
      ['Which joint lies just above the pastern?', 'Fetlock', 'Stifle', 'Hock', 'Elbow'],
      ['Follow the hind leg downward from the stifle. Which joint is next?', 'Hock', 'Elbow', 'Carpus', 'Pastern joint'],
      ['Where is the frog of the hoof?', 'On the underside', 'At the top of the hoof wall', 'Above the hock', 'On the front of the knee'],
      ['Where does the skin meet the top of the hoof wall?', 'Coronary band', 'Chestnut', 'Ergot', 'Cannon'],
      ['A mouthful of hay leaves the stomach. Where does it go next?', 'Small intestine', 'Cecum', 'Large colon', 'Esophagus'],
      ['Which pair ferments much of the horse’s dietary fiber?', 'Cecum and large colon', 'Stomach and esophagus', 'Mouth and stomach', 'Esophagus and small intestine']
    ],
    sources: [
      ['University of Vermont Extension · External anatomy','https://www.uvm.edu/sites/default/files/4-H-and-Youth/Activity%20Sheet%20Answer%20Keys/Horse/Horse_Activity_Page_1Key.pdf'],
      ['University of Minnesota Extension · The digestive system','https://extension.umn.edu/horse-nutrition/equine-digestive-system']
    ]
  },
  {
    id: 'abyss', number: '02', title: 'Abyssal Biology', accent: '#88d3d1',
    intro: 'No rain falls upward. The water outside the window does.',
    shift: 'The glass bows inward. A light moves far below it.',
    study: 'The twilight zone runs from about 200 to 1,000 meters, the midnight zone from 1,000 to 4,000, the abyss from 4,000 to 6,000, and the hadal zone deeper still. Pressure rises as you descend. Marine snow is sinking organic debris. At some vents, microbes use chemical energy. Bioluminescence is light made by a chemical reaction. Anglerfish lure prey. Photophores are light organs. A whale fall feeds seafloor organisms.',
    threat: {name:'The Drowned Angler',view:'left',tell:'WINDOW · A light moves against the current.',action:'Hold the floodlight',hold:1.15,pan:-.84,method:'hold',hit:'The Drowned Angler broke through the pane.'},
    practical: {id:'beam',view:'left',title:'Searchlight',brief:'Move the light with your mouse, finger or arrow keys. Follow the angler until it dives.',goal:3.6,buttons:[]},
    questions: [
      ['The depth gauge reads 300 meters. What zone is this?', 'Twilight zone', 'Sunlight zone', 'Abyssal zone', 'Hadal zone'],
      ['The gauge passes 1,500 meters. Which zone are you in?', 'Midnight zone', 'Twilight zone', 'Sunlight zone', 'Hadal zone'],
      ['A camera descends to 5,000 meters in open ocean. Which zone is it in?', 'Abyssal zone', 'Twilight zone', 'Hadal zone', 'Sunlight zone'],
      ['Which zone includes the deepest parts of ocean trenches?', 'Hadal zone', 'Sunlight zone', 'Twilight zone', 'Midnight zone'],
      ['What happens to water pressure as your sampler sinks?', 'It increases', 'It decreases', 'It stays the same', 'It vanishes below the twilight zone'],
      ['The camera sees pale flakes drifting down. What is marine snow?', 'Sinking organic debris', 'Salt crystals from sea spray', 'Ice from the seabed', 'Ash from the Moon'],
      ['Vent microbes can make food without sunlight. What process uses chemical energy?', 'Chemosynthesis', 'Photosynthesis', 'Fluorescence', 'Evaporation'],
      ['What makes an animal’s own bioluminescent light?', 'A chemical reaction', 'A reflected sunbeam', 'Friction with seawater', 'Compression of sand'],
      ['Why does a deep-sea anglerfish dangle a bright lure?', 'To draw prey within reach', 'To warm the water', 'To filter seawater', 'To test the current'],
      ['Your specimen has rows of photophores. What are they?', 'Light-producing organs', 'Pressure-resistant eggs', 'Sensory whiskers', 'Layers of teeth'],
      ['A whale fall reaches the bottom. What arrives there?', 'A carcass that can feed a community', 'A cold current from polar seas', 'A cloud of vent minerals', 'A school of newborn whales'],
      ['Why can’t ordinary photosynthesis power a community at 3,000 meters?', 'There is too little sunlight', 'The water is always fresh', 'Gravity is absent', 'The water contains no minerals']
    ],
    sources: [
      ['NOAA Ocean Exploration · Light zones','https://oceanexplorer.noaa.gov/ocean-fact/light-distributed/'],
      ['NOAA Ocean Exploration · Living light','https://oceanexplorer.noaa.gov/ocean-fact/living-light/'],
      ['NOAA Ocean Exploration · Bioluminescent adaptations','https://oceanexplorer.noaa.gov/wp-content/uploads/2025/04/bioluminescence-fact-sheet.pdf']
    ]
  },
  {
    id: 'fungal', number: '03', title: 'Fungal Ecology', accent: '#c0a8e4',
    intro: 'The cracked glass stays dark. A second light grows along the seams of the wall.',
    shift: 'The room exhales. Its new lungs are in the plaster.',
    study: 'A hypha is a filament. A network of hyphae is mycelium. Mushrooms are spore-bearing fruiting bodies. Gills on many caps bear spores. Fungi include yeasts, and their walls commonly contain chitin. Decomposers release nutrients from dead matter. Mycorrhizae connect fungi and roots, exchanging minerals and water for plant-made sugars. Lichens pair a fungus with a photosynthetic partner. Rust fungi infect living plants.',
    threat: {name:'The Bloom',view:'right',tell:'RIGHT WALL · Wet stems are splitting the plaster.',action:'Hold the vent shut',hold:1.45,pan:.84,method:'hold',hit:'A cloud of spores reached your face.'},
    practical: {id:'vents',view:'right',title:'The Spore Manifold',brief:'Shut all three vents. Switch 1 flips A + B. Switch 2 flips B + C. Switch 3 flips C.',goal:3,buttons:['1','2','3']},
    questions: [
      ['Under a microscope, what is one thread of a filamentous fungus?', 'A hypha', 'A root hair', 'A gill', 'A vein'],
      ['The threads form a network beneath the floor. What is the network called?', 'Mycelium', 'Stomata', 'Plankton', 'A stipe'],
      ['What is the mushroom above that network?', 'A fruiting body', 'A plant seedling', 'An insect nest', 'A root cap'],
      ['What do the gills beneath many mushroom caps help produce?', 'Spores', 'Seeds', 'Roots', 'Pollen'],
      ['What common structural material occurs in fungal cell walls?', 'Chitin', 'Keratin', 'Calcium carbonate', 'Collagen'],
      ['Which of these is a fungus that often grows as single cells?', 'Yeast', 'Moss', 'Fern', 'Kelp'],
      ['What role does a fungus play as it breaks down a fallen branch?', 'Decomposer', 'Primary producer', 'Pollinator', 'Herbivore'],
      ['What does a mycorrhizal fungus associate with?', 'Plant roots', 'Bird feathers', 'Fish gills', 'Mammal teeth'],
      ['What can a mycorrhizal fungus help a plant take up?', 'Phosphorus', 'Sunlight', 'Pollen', 'Chitin'],
      ['What does a plant typically provide to a mycorrhizal partner?', 'Carbon compounds made by photosynthesis', 'Spore cases', 'A supply of feathers', 'Light from its roots'],
      ['What kind of partner makes food using light in a lichen?', 'An alga or cyanobacterium', 'A worm', 'A second nonphotosynthetic fungus', 'A plant root'],
      ['Orange rust pustules appear on living wheat. How is the rust fungus acting?', 'As a plant pathogen', 'As a photosynthetic producer', 'As a root nodule', 'As a seed disperser']
    ],
    sources: [
      ['USDA Forest Service · Fungi and forest ecosystems','https://research.fs.usda.gov/treesearch/38089'],
      ['USDA Natural Resources Conservation Service · Soil fungi','https://www.nrcs.usda.gov/state-offices/illinois/soil-tech-note-7a-fungi'],
      ['USDA Forest Service · Lichen biology','https://www.fs.usda.gov/wildflowers/beauty/lichens/biology.shtml']
    ]
  },
  {
    id: 'bog', number: '04', title: 'Bog Archaeology', accent: '#e7a383',
    intro: 'The lower hall has turned to peat. Leave the footprints where you find them.',
    shift: 'The floor gives. Something has been underneath it a very long time.',
    study: 'Peat builds from partly decayed plant matter. Sphagnum moss helps create acidic conditions in many raised bogs. Cold, waterlogged, oxygen-poor peat can preserve skin, hair, clothes, and even a last meal, while acid can remove bone minerals. Radiocarbon dating can estimate the age of suitable organic remains. A find’s depth and nearby objects provide context. Tollund Man was found in Denmark. Excavated wet remains require controlled conservation.',
    threat: {name:'The Peat Walker',view:'front',tell:'HALL · Bare feet lift out of the mud.',action:'Hold the door bolt',hold:1.5,pan:0,method:'hold',hit:'The Peat Walker crossed the threshold.'},
    practical: {id:'breath',view:'front',title:'The Breath Test',brief:'When it faces you, hold the cloth or Space. Release to breathe as soon as it turns away.',goal:3,buttons:['HOLD']},
    questions: [
      ['What is peat made from primarily?', 'Partly decayed plant material', 'Crushed volcanic glass', 'Ground shell fragments', 'Fresh mineral sand'],
      ['Which moss often helps acidify a raised bog?', 'Sphagnum', 'Clubmoss', 'Spanish moss', 'Sea moss'],
      ['Which combination can slow decay in a raised bog?', 'Cold, acidic and low in oxygen', 'Hot, dry and full of oxygen', 'Warm, aerated and alkaline', 'Dry, salty and exposed'],
      ['What can acidic bog water leach out of bone?', 'Minerals', 'All radioactivity', 'Sunlight', 'Metal tools'],
      ['Which soft tissue has survived in some bog finds?', 'Skin', 'Only tooth enamel', 'Only the mineral in bone', 'No soft tissue can survive'],
      ['Which find could reveal what a bog body ate shortly before death?', 'Preserved stomach contents', 'A modern photograph of the bog', 'The excavation team’s boots', 'The nearest living tree’s leaves'],
      ['Which method can estimate the age of a suitable organic sample?', 'Radiocarbon dating', 'Sonar mapping', 'Magnetic compass reading', 'A pH test alone'],
      ['Why record the layer and nearby objects before lifting a find?', 'They preserve its archaeological context', 'They restore its original color', 'They stop rain falling', 'They make the artifact heavier'],
      ['Which country yielded the Tollund Man find?', 'Denmark', 'Canada', 'Egypt', 'Australia'],
      ['Why keep excavated wet remains under controlled conditions?', 'Uncontrolled drying can distort them', 'Drying reveals a date stamp', 'Water turns them to bronze', 'Cold makes them radioactive'],
      ['A preserved body has reddish hair. What can complicate inferring its original color?', 'Chemical changes in the bog', 'The site’s latitude alone', 'The modern date of excavation', 'The length of the hair'],
      ['Which tool lets a researcher examine internal features without cutting open the remains?', 'CT imaging', 'A pH strip', 'A ruler', 'A metal detector']
    ],
    sources: [
      ['National Museum of Denmark · Chemistry of bog preservation','https://en.natmus.dk/historical-knowledge/denmark/prehistoric-period-until-1050-ad/the-early-iron-age/the-woman-from-huldremose/the-chemistry-of-the-bog-bodies/'],
      ['Niels Lynnerup · Bog Bodies','https://doi.org/10.1002/ar.23138'],
      ['National Geographic Education · Bog Bodies','https://education.nationalgeographic.org/resource/bog-bodies/']
    ]
  },
  {
    id: 'eclipse', number: '05', title: 'Eclipse Mechanics', accent: '#dec1fa',
    intro: 'The clock points straight up. Through the rafters you see a second horizon.',
    shift: 'The sky presses against the ceiling. One last practical.',
    study: 'Solar eclipse: Moon between Earth and Sun at new moon. Lunar eclipse: Earth between Sun and Moon at full moon. The Moon’s orbit is tilted, so most new moons miss the alignment. The umbra is the full shadow, the penumbra a partial shadow, and the antumbra the region where a smaller apparent Moon leaves a ring. The corona is the Sun’s outer atmosphere. Earth’s atmosphere filters light that reaches a totally eclipsed Moon. A Saros is about 18 years.',
    threat: {name:'The Parallax',view:'up',tell:'CEILING · A dark disk slides across the gap.',action:'Hold it in view',hold:1.35,pan:0,method:'watch',hit:'The room shifted beneath your chair.'},
    practical: {id:'orrery',view:'front',title:'The Orrery',brief:'Drag the Moon over the Sun. Use − or + to match their rims, then lock the alignment.',goal:1,buttons:['−','+','LOCK']},
    questions: [
      ['During a solar eclipse, which body is between the other two?', 'Moon', 'Earth', 'Sun', 'Mars'],
      ['Which phase is required for a solar eclipse?', 'New moon', 'Full moon', 'First quarter', 'Last quarter'],
      ['Which phase is required for a lunar eclipse?', 'Full moon', 'New moon', 'Waxing crescent', 'Last quarter'],
      ['Why isn’t there a solar eclipse every new moon?', 'The Moon’s orbit is tilted', 'The Sun stops shining at new moon', 'The Moon stops orbiting', 'Earth casts no shadow'],
      ['The Sun is fully hidden. Which part of the Moon’s shadow are you in?', 'Umbra', 'Penumbra', 'Antumbra', 'Corona'],
      ['From the penumbra, how much of the Sun is covered?', 'Only part of it', 'All of it', 'None of it, anywhere in the penumbra', 'Exactly one half at every point'],
      ['What is left visible around the Moon during an annular solar eclipse?', 'A bright ring of the Sun', 'An image of Earth’s surface', 'A ring of stars at the same brightness as the Sun', 'Nothing outside the Moon'],
      ['In which part of the shadow can observers see an annular eclipse?', 'Antumbra', 'Umbra', 'Corona', 'Zenith'],
      ['What is the corona visible around the Sun during totality?', 'The Sun’s outer atmosphere', 'The Moon’s surface', 'Earth’s magnetic pole', 'An asteroid belt'],
      ['Why can a totally eclipsed Moon look red?', 'Light reaching it has been filtered by Earth’s atmosphere', 'The Moon produces red light', 'Its surface heats up and glows', 'The Sun emits only red light that night'],
      ['What is the path of totality?', 'The ground track of the Moon’s umbra', 'The Moon’s entire orbit', 'The edge of the Sun’s atmosphere', 'A line joining both poles'],
      ['About how long is one Saros cycle?', '18 years', '18 days', '18 months', '180 years']
    ],
    sources: [
      ['NASA Science · Eclipse geometry','https://science.nasa.gov/eclipses/geometry/'],
      ['NASA Science · Eclipse glossary','https://science.nasa.gov/eclipses/glossary/'],
      ['NASA Science · Saros cycles','https://science.nasa.gov/eclipses/future-eclipses/eclipse-2023/faq/']
    ]
  }
];

const questionsPerCourse = 12;
const allowedMisses = 3;
const examMinutes = 18;

function makeExam(random = Math.random) {
  return courses.map(course => course.questions.map(([prompt,...choices]) => {
    const options = choices.map((text,i) => ({text,correct:i === 0}));
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return {prompt,options,correct:options.findIndex(option => option.correct)};
  }));
}

const paperPlates = [
  {item:0,label:'Side view of a horse',viewBox:'0 0 380 192',drawing:`<path class="detail" d="M46 177H365" opacity=".45"/>
    <path class="bone" d="M182 98 Q194 105 197 123 L194 145 201 164 204 174 H186
      L187 167 181 146 181 128 174 108 Z M294 102 Q306 106 307 119 L295 139
      L294 161 300 173 H282 L284 164 282 137 289 118 Z"/>
    <path class="mane" d="M321 68 C347 70 352 88 349 111 C347 128 347 145 359 156
      C343 152 338 142 337 127 C335 115 342 96 332 87 L321 80 Z"/>
    <path class="ink" d="M101 49 L114 28 125 23 124 11 132 19 137 10 140 24
      C155 24 164 39 175 50 L191 59 Q199 54 207 61
      C232 67 257 68 280 60 C297 52 314 55 325 64
      C339 74 336 95 327 107 L310 127 319 141 312 160 314 170 317 177 H299
      L302 168 302 157 307 143 293 128 Q284 120 282 108
      C261 124 225 123 203 108 Q199 117 192 121 L187 141 187 160
      L194 175 192 180 H174 L176 170 175 158 176 139 174 122
      Q166 111 170 99 C161 92 156 79 151 68 L139 60
      Q132 69 116 71 L96 78 Q89 80 84 75 L81 68 Q82 64 90 60 Z"/>
    <path class="mane" d="M137 24 C154 21 166 39 176 48 L196 59
      L187 61 182 65 178 62 174 63 169 56 164 56 157 45
      Q150 37 140 33 L129 33 Z"/>
    <path class="coat-light" d="M211 67 C235 74 260 73 280 66 Q294 60 310 63
      Q302 69 291 74 C265 82 232 82 211 72 Z M184 76 Q192 78 194 86
      Q182 96 177 110 Q173 100 177 88 Z"/>
    <path class="detail" d="M113 34 Q120 30 125 32 M120 38 Q123 37 126 39
      M84 72 Q95 72 105 67 M100 62l5-1 M129 45 Q138 46 142 53
      M143 49 Q153 53 160 65 L171 84 M188 66 Q197 71 195 86
      Q193 96 184 104 M182 138h6m-10 30h10m111-35 9-6m-5 14 11 2m-12 24h10
      M304 72 Q318 78 319 90 Q317 101 310 108 M284 88 Q279 98 282 108
      M207 104 Q220 115 236 115 M337 86 Q346 97 343 111 L343 134"/>
    <path class="mane" d="M176 170 L186 170 192 175 192 180 H174 Z
      M303 168 H313 L317 177 H299 Z"/>
    <path class="detail" d="M215 84 Q214 97 221 108 M225 84 Q224 99 231 110
      M235 84 Q234 100 241 111 M245 84 Q243 99 250 109" opacity=".55"/>`},
  {item:0,label:'Sampling line from the surface to 300 meters',viewBox:'0 0 380 104',drawing:`
    <path d="M52 21H328M52 60H328" class="detail"/>
    <path d="M169 14h42l-7 7h-31zM185 77h9v12h-9z" class="ink"/>
    <path d="M190 21v56M228 22v62m-5-6 5 6 5-6" class="detail"/>
    <text x="101" y="16">SURFACE</text><text x="274" y="87">300 M</text>`},
  {item:1,label:'Branching fungal filaments',viewBox:'0 0 380 104',drawing:`
    <path d="M70 91q40-26 67-26t42-19t29-30m-71 49q-19-27-20-40m61 20q37 15 69 6l42-26m-42 26q19 11 30 37m-69-72 11-12m-11 12 24-1M116 31l-20-10m20 10 12-17m143 61 24-4m-24 4 4 16" class="detail"/>
    <text x="98" y="103">CULTURE SLIDE 03</text>`},
  {item:7,label:'A marked object inside the middle of three excavation layers',viewBox:'0 0 380 104',drawing:`
    <path d="M55 16h270v76H55z" class="ink"/>
    <path d="M55 32l56 4 50-5 71 5 44-6 49 2M55 64l50-4 73 5 62-6 85 2" class="detail"/>
    <path d="M181 45l12-6 15 3 7 8-10 7h-18z" class="mane"/>
    <path d="M67 20v71m0-56h6m-6 18h6m-6 18h6" class="detail"/>`},
  {item:0,label:'Three unlabelled bodies aligned on an orbital diagram',viewBox:'0 0 380 104',drawing:`
    <path d="M52 53h276" class="detail"/>
    <circle cx="82" cy="53" r="36" class="coat-light"/>
    <circle cx="193" cy="53" r="8" class="mane"/>
    <circle cx="285" cy="53" r="24" class="ink"/>
    <path d="M186 47l87-11m-87 23 87 10" class="detail"/>`}
];
