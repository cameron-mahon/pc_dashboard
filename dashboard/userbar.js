import { currentUser, logout } from './auth.js';
import { esc } from './store.js';

const CRAB_PHOTOS = {
  'Yeti':'./yeti.avif',
  'Maryland Blue':'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/The_Childrens_Museum_of_Indianapolis_-_Atlantic_blue_crab.jpg/250px-The_Childrens_Museum_of_Indianapolis_-_Atlantic_blue_crab.jpg',
  'Dungeness':'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/DungenessCrab.jpg/250px-DungenessCrab.jpg',
  'Florida Stone':'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Juvenile_Stone_Crab_at_Smyrna_Dunes_Park_-_Flickr_-_Andrea_Westmoreland.jpg/250px-Juvenile_Stone_Crab_at_Smyrna_Dunes_Park_-_Flickr_-_Andrea_Westmoreland.jpg',
  'Peekytoe':'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Cancer_pagurus.jpg/250px-Cancer_pagurus.jpg',
  'Jonah':'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Jonah_crab_noaa_overhead_picture_accessed-2024-04-24.jpg/250px-Jonah_crab_noaa_overhead_picture_accessed-2024-04-24.jpg',
  'Japanese Spider':'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Macrocheira_kaempferi.jpg/250px-Macrocheira_kaempferi.jpg',
  'Snow':'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Chionoecetes_bairdi.jpg/250px-Chionoecetes_bairdi.jpg',
  'Brown':'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Cancer_pagurus.jpg/250px-Cancer_pagurus.jpg',
  'Chesapeake Blue':'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/The_Childrens_Museum_of_Indianapolis_-_Atlantic_blue_crab.jpg/250px-The_Childrens_Museum_of_Indianapolis_-_Atlantic_blue_crab.jpg',
  'Mud':'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/CSIRO_ScienceImage_10696_Mud_crabs_are_caught_measured_tagged_and_released_as_part_of_the_research_into_the_effectiveness_of_green_zones_in_Moreton_Bay.jpg/250px-CSIRO_ScienceImage_10696_Mud_crabs_are_caught_measured_tagged_and_released_as_part_of_the_research_into_the_effectiveness_of_green_zones_in_Moreton_Bay.jpg',
  'Mangrove':'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Red_mangrove_crab_%28Neosarmatium_meinerti%29.jpg/250px-Red_mangrove_crab_%28Neosarmatium_meinerti%29.jpg',
  'Flower':'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Portunus_pelagicus_male.jpg/250px-Portunus_pelagicus_male.jpg',
  'Ghost':'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Ocypode-ceratophthalma-horned-ghost-crab-krabi-thailand.jpg/250px-Ocypode-ceratophthalma-horned-ghost-crab-krabi-thailand.jpg',
  'Fiddler':'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Fiddler_crab.jpg/250px-Fiddler_crab.jpg',
  'Red Rock':'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Cancer_productus.jpg/250px-Cancer_productus.jpg',
  'Southern Kelp':'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Taliepus_nuttallii_21393693.jpg/250px-Taliepus_nuttallii_21393693.jpg',
  'Sheep':'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Sheepcrab_300.jpg/250px-Sheepcrab_300.jpg',
  'Box':'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Calappa_hepatica.JPG/250px-Calappa_hepatica.JPG',
  'Calico':'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Hepatus_epheliticus.jpg/250px-Hepatus_epheliticus.jpg',
  'Arrow':'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Stenorhynchus_seticornis.jpg/250px-Stenorhynchus_seticornis.jpg',
  'Green':'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Carcinus_maenas.jpg/250px-Carcinus_maenas.jpg',
  'Velvet Belly':'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Etreinte_d%27%C3%A9trilles_%28Necora_puber%29_%28Ifremer_00557-66881_-_20149%29.jpg/250px-Etreinte_d%27%C3%A9trilles_%28Necora_puber%29_%28Ifremer_00557-66881_-_20149%29.jpg',
  'Halloween Moon':'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Pacific_land_crab_%28Gecarcinus_quadratus%29.jpg/250px-Pacific_land_crab_%28Gecarcinus_quadratus%29.jpg',
  'Pea':'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Pinnotheres_pisum.jpg/250px-Pinnotheres_pisum.jpg',
  'Soldier':'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Aus_soldier_Crab_%28lightened%29.jpg/250px-Aus_soldier_Crab_%28lightened%29.jpg',
  'Mitten':'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/EriocheirSinensis1.jpg/250px-EriocheirSinensis1.jpg',
  'Shore':'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Striped_shore_crab%2C_Pachygrapsus_crassipes_crop.jpg/250px-Striped_shore_crab%2C_Pachygrapsus_crassipes_crop.jpg',
  'Marble':'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Procambarus_fallax_forma_virginalis.jpg/250px-Procambarus_fallax_forma_virginalis.jpg',
  'Yellowline Arrow':'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Stenorhynchus_seticornis.jpg/250px-Stenorhynchus_seticornis.jpg',
  'Spider Decorator':'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Graceful_Decorator_Crab_%28Oregonia_gracilis%29.jpg/250px-Graceful_Decorator_Crab_%28Oregonia_gracilis%29.jpg',
  'Alaskan King':'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Neolithodes_agassizii_eating.jpg/250px-Neolithodes_agassizii_eating.jpg',
  'Red King':'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Spider_crab.jpg/250px-Spider_crab.jpg',
  'Blue King':'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Paralithodes_platypus_%28Blue_king_crab%29.jpg/250px-Paralithodes_platypus_%28Blue_king_crab%29.jpg',
  'Golden King':'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Golden_king_crab.jpg/250px-Golden_king_crab.jpg',
  'Coconut':'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Coconut_Crab_Birgus_latro.jpg/250px-Coconut_Crab_Birgus_latro.jpg',
  'Hermit':'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Calliactis_and_Dardanus_001.JPG/250px-Calliactis_and_Dardanus_001.JPG',
  'Porcelain':'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/South_eastern_Pacific_species_of_Petrolisthes%2C_Allopetrolisthes%2C_and_Liopetrolisthes_%28Porcellanidae%29.jpg/250px-South_eastern_Pacific_species_of_Petrolisthes%2C_Allopetrolisthes%2C_and_Liopetrolisthes_%28Porcellanidae%29.jpg',
  'Mole':'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Female-sand-crab-back.jpg/250px-Female-sand-crab-back.jpg',
  'Squat Lobster':'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Munidopsis_tridentata.jpg/250px-Munidopsis_tridentata.jpg',
  'Tasmanian Giant':'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/J_J_Wild_Pseudocarcinus_cropped_2.jpg/250px-J_J_Wild_Pseudocarcinus_cropped_2.jpg',
  'Spiny King':'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/NeolithodesGrimaldiiRay.jpg/250px-NeolithodesGrimaldiiRay.jpg',
  'Pom Pom':'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Lybia_tessellata.jpg/250px-Lybia_tessellata.jpg',
  'Horseshoe':'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Limulus_polyphemus_%28aq.%29.jpg/250px-Limulus_polyphemus_%28aq.%29.jpg',
  'Triops':'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Triops_longicaudatus2.jpg/250px-Triops_longicaudatus2.jpg',
};

export function getCrabPhoto(name) {
  return CRAB_PHOTOS[name] || null;
}

function avatarImg(name, cls) {
  const src = CRAB_PHOTOS[name];
  if (src) return `<div class="${cls}"><img src="${src}" alt="${esc(name)}"></div>`;
  const ini = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return `<div class="${cls} avatar-fallback">${ini}</div>`;
}

export function initUserBar() {
  const user = currentUser();
  if (!user) return;

  const container = document.querySelector('[data-sidebar-profile]');
  if (!container) return;

  container.innerHTML = `
    <span class="user-bar-name">${esc(user.name)}</span>
    ${avatarImg(user.name, 'avatar avatar-lg')}
    <span class="user-bar-role">${esc(user.role)}</span>
    <button class="user-bar-logout"><svg viewBox="0 0 20 20"><path d="M7 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3"/><path d="M14 13l3-3-3-3"/><path d="M17 10H7"/></svg>Sign out</button>
  `;
  container.querySelector('.user-bar-logout').addEventListener('click', logout);
}
