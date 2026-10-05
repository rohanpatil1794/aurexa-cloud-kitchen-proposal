// Client-facing copy for every room: a short purpose and 2–3 "Design notes".
// Written to match src/data/layout.ts (doors, adjacencies) and the modelled equipment (src/data/equipment/*).
// If a door or an item moves, re-read the notes for that room.
// Rules: no metrics and no dimensions (the card shows the size); the only numbers are facts of the plan itself
// (door counts, station counts). Purpose stays under about 100 characters so it holds two lines on a phone.
import type { RoomCopy, RoomId } from './types';

export const ROOM_COPY: Record<RoomId, RoomCopy> = {
  stair: {
    purpose: 'The escape stair in the north-west corner. One door, one purpose: an enclosed way out.',
    notes: [
      'Enclosed behind a single door onto the top corridor, so it stays apart from the working floor.',
      'At the west end of the top corridor, which runs the full width: a straight run for every north-side room.',
      'Dog-leg flight with a half-landing, an EXIT sign above the door and plain concrete underfoot.',
    ],
  },

  veg: {
    purpose: 'Where every vegetarian dish begins. Green boards, bins and floor keep the room visibly its own.',
    notes: [
      'Its own door onto the top corridor, with solid walls either side: no way through to a neighbour.',
      'Ingredients reach that door along the top corridor from Receiving and the stores.',
      'A ribbon window high on the north wall brings in daylight and leaves the wall below free for the sink.',
    ],
  },

  jain: {
    purpose: 'Jain cooking has its own ingredient rules, so it gets its own yellow room, bench, boards and bins.',
    notes: [
      'Between Veg and Vegan prep, with a solid wall on each side and its only door on the top corridor.',
      'Yellow on the floor, the boards and the bins: staff can tell at a glance whose room they are in.',
      'Prepped food leaves by the same door and goes along the corridor to the kitchen’s north doors.',
    ],
  },

  vegan: {
    purpose: 'Plant-based food in a room with no animal product. Purple boards and bins make the rule clear.',
    notes: [
      'A solid east wall separates it from Non-Veg Prep, the neighbour it most needs to stay clear of.',
      'Its door lines up closely with a kitchen door across the corridor: the shortest trip of the four prep rooms.',
      'Purple floor, boards and bins, with a ribbon window high on the north wall for daylight.',
    ],
  },

  nonveg: {
    purpose: 'Meat, poultry and fish are cut and cleaned here, and only here. Red boards and bins mark the room.',
    notes: [
      'The widest of the four prep rooms, so cutting, trimming and washing do not crowd each other.',
      'A solid east wall keeps raw meat apart from the Bakery next door.',
      'One door onto the top corridor, a blast chiller in the corner and a hand-wash basin by the door.',
    ],
  },

  bakery: {
    purpose: 'A bakery of its own for breads and bakes, with a double door wide enough for loaded racks.',
    notes: [
      'Spiral mixer, proofer and deck ovens along the north wall, with rolling racks to carry trays between them.',
      'The double door opens onto the top corridor, across from the kitchen’s wider north door.',
      'Apart from the hot kitchen, so oven heat and flour dust stay in the bakery. A ribbon window adds daylight.',
    ],
  },

  cold: {
    purpose: 'Chilled storage for all four diets under one roof, with every fridge kept to its own zone.',
    notes: [
      'Four tall fridges, one per diet, in the zone colours: green, yellow, purple and red.',
      'A walk-in cold room on the east side holds bulk chilled stock. The only door faces the top corridor.',
      'A steel floor finish washes down easily and reads clearly as cold, clean space.',
    ],
  },

  dry: {
    purpose: 'Shelf-stable goods in crates on steel racking, with its own door through to Receiving.',
    notes: [
      'A door onto the top corridor links it to prep, the bakery and the kitchen.',
      'A door straight through to Receiving, with pallets staged beside it, is the short way in for deliveries.',
      'Three racking rows hold grains and pulses, oils and spices, and packaging, all kept off the floor.',
    ],
  },

  lift: {
    purpose: 'Where the Raw material route begins. Deliveries arrive here and go straight into Receiving.',
    notes: [
      'Its only door opens into Receiving, so nothing reaches storage or the kitchen without passing through it.',
      'Deliveries enter at the north-east corner; staff enter at the south-east. The two never share an entrance.',
    ],
  },

  recv: {
    purpose: 'Every delivery stops here first: checked in, inspected, and only then sent on to storage or prep.',
    notes: [
      'Three doors, three jobs: the lift in, Dry Storage alongside, the top corridor out.',
      'A floor scale, pallet and inspection table line the east wall; REJECT and PACKAGING bins stand opposite.',
      'From here raw material travels west along the top corridor to cold storage, prep and the kitchen.',
    ],
  },

  dessert: {
    purpose: 'A dedicated, cool room for desserts, away from the hot line, with two freezers and a marble counter.',
    notes: [
      'Two doors only: one east onto the left corridor, one south straight into Packing.',
      'Marble stays cool under the hand, which suits sugar, chocolate and pastry.',
      'The two freezers flank the east door, so set desserts can wait in the room until Packing is ready.',
    ],
  },

  pack: {
    purpose: 'The checkpoint between kitchen and customer: hot food and desserts meet at one table under a QC lamp.',
    notes: [
      'Three doors: desserts arrive from the north, hot food from the bottom corridor, orders leave to Dispatch.',
      'A central table with sealer, scale, label printer and boxes: packers work from every side.',
      'The QC lamp over the table gives each order a final look under proper light.',
    ],
  },

  kitchen: {
    purpose: 'The heart of the plan: a back cooking line, a wok station, four cuisine islands and a long pass.',
    notes: [
      'Four islands: Indian (tandoor), Chinese (wok burners), Continental (flat-top) and European (ranges).',
      'One stainless hood spans the back line and wok station; an emergency gas shut-off sits by the west door.',
      'Ingredients come in from the top corridor; finished dishes leave through the pass to the bottom corridor.',
    ],
  },

  dish: {
    purpose: 'Every dirty dish returns here and leaves clean: five stages, one direction, collection to storage.',
    notes: [
      'On the return corridor, straight across from the kitchen’s east door: dirty ware skips the cooking floor.',
      'Stages run in order: dirty collection, wash, sanitise, dry, storage.',
      'A second door onto the staff spine lets staff in and clean ware out, without entering the kitchen.',
    ],
  },

  dispatch: {
    purpose: 'The last stop on the Orders out route. Packed orders are handed over here and leave by a double door.',
    notes: [
      'Packing & QC feeds it directly through a connecting door, so a checked order goes straight to hand-over.',
      'The double door opens onto the Delivery Partners Pickup Zone, where a cantilevered canopy gives cover.',
      'An emergency exit at the west end, a door through to Rider Waiting and another onto the bottom corridor.',
    ],
  },

  rider: {
    purpose: 'A comfortable place for delivery partners to wait and charge, beside Dispatch and the pickup zone.',
    notes: [
      'Benches, charging lockers and a screen: the basics, done properly.',
      'A timber floor sets it apart from the working rooms and makes waiting feel like hospitality.',
      'Doors to Dispatch and straight outside give riders a direct route; a third opens onto the bottom corridor.',
    ],
  },

  waste: {
    purpose: 'The waste route ends here: sorted into six colour-coded bins and out through its own service door.',
    notes: [
      'A sorting table, storage cage and six bins keep each waste stream apart from the moment it arrives.',
      'Two doors from the bottom corridor let the dirty-utensil trolley enter and leave without reversing.',
      'A service door opens straight outside, so waste leaves the building without retracing its steps.',
    ],
  },

  garden: {
    purpose: 'A green pause in a working building: planter beds, trees, a pergola and a bench under a skylight.',
    notes: [
      'Glazed north and south, so daylight comes through and the planting shows from the bottom corridor.',
      'A glazed double door on the bottom corridor makes it an easy place for staff to step in and reset.',
      'Three kinds of tree, bamboo and a pergola with hanging baskets soften a building of steel and tile.',
    ],
  },

  lockers: {
    purpose: 'Where staff change into uniform and leave their bags behind, before anyone goes near food.',
    notes: [
      'One door, onto the staff spine. Nothing connects it to a food room.',
      'The top corridor begins just beyond the north end of the spine: from changing to work with no detour.',
      'On the olive Staff route of the plan, this is where everyday clothes become uniform.',
    ],
  },

  elec: {
    purpose: 'The building’s power room: UPS cabinets, distribution boards and a cable tray, all in one place.',
    notes: [
      'Entered only from the staff spine, so engineers reach it without passing through a kitchen.',
      'Two UPS cabinets stand by to carry key equipment through a power cut.',
      'Concrete floor, a rubber safety mat and a cable tray overhead: robust, serviceable, nothing decorative.',
    ],
  },

  creator: {
    purpose: 'A corner built for filming: a teal backdrop, ring light and camera turn the kitchen’s story into content.',
    notes: [
      'Teal backdrop wall, ring light, camera and a round table: ready to shoot.',
      'On the staff spine just north of the lobby, behind a glass partition that shows the shoot.',
      'Blue is its own fifth zone, outside the four diet colours. A glowing kitchen-name sign marks the spot.',
    ],
  },

  toilets: {
    purpose: 'Male and female cubicles with hand basins, entered from the staff lobby rather than any working room.',
    notes: [
      'One door off the lobby: two male and two female cubicles, with basins and hand dryers either side.',
      'Close to the Staff Entrance, in the south-east, the far side of the plan from the prep rooms.',
    ],
  },

  exit: {
    purpose: 'A short, clear way from the staff route to outside: green EXIT sign above, outward-opening door ahead.',
    notes: [
      'The door opens outward, so a crowd pushes it open instead of jamming it.',
      'Next to the Staff Entrance, the logo door, but a separate door: the escape route is never the daily one.',
      'With the Dispatch exit it makes two emergency exits, at opposite ends of the south wall.',
    ],
  },
};
