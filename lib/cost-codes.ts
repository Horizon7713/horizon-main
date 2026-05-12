export type CostCode = {
  code: string
  label: string
  fullPath: string
}

const COST_CODE_RAW = `
02 Site Work
04 Concrete
1.00 Land Cost
1.00 Land Cost:1.01 Purchase Property
1.00 Land Cost:1.02 Property Taxes
1.00 Land Cost:1.03 HOA Dues
1.00 Land Cost:1.04 Assessment Fees
1.00 Land Cost:1.05 Loan Fees
1.00 Land Cost:1.06 Title Fees
1.00 Land Cost:1.07 Interest on Loan
10.00 Excavation/Utilities
10.00 Excavation/Utilities:10.01 Excavation Fuel
10.00 Excavation/Utilities:10.02 Excavation Subcontractor
10.00 Excavation/Utilities:10.03 Excavation w/Tractor cost
10.00 Excavation/Utilities:10.03 Excavation w/Tractor cost:10.03.01 Layout
10.00 Excavation/Utilities:10.03 Excavation w/Tractor cost:10.03.1 Transport Equipment
10.00 Excavation/Utilities:10.03 Excavation w/Tractor cost:10.03.2 Equipment Repair
10.00 Excavation/Utilities:10.03 Excavation w/Tractor cost:10.03.3 Equipment Rental
10.00 Excavation/Utilities:10.03 Excavation w/Tractor cost:10.03.4 Over Excavation/Soil Re
10.00 Excavation/Utilities:10.03 Excavation w/Tractor cost:10.03.4 Over Excavation/Soil Re:10.03.4.01 Native Soil Remove
10.00 Excavation/Utilities:10.03 Excavation w/Tractor cost:10.03.4 Over Excavation/Soil Re:10.03.4.02 Structural Pad
10.00 Excavation/Utilities:10.03 Excavation w/Tractor cost:10.03.4 Over Excavation/Soil Re:10.03.4.03 Dig Footings
10.00 Excavation/Utilities:10.03 Excavation w/Tractor cost:10.03.5 Site Trenching
10.00 Excavation/Utilities:10.03 Excavation w/Tractor cost:10.03.6 Excavation Extras
10.00 Excavation/Utilities:10.04 Backfill
10.00 Excavation/Utilities:10.04 Backfill:10.04.1 French Drain
10.00 Excavation/Utilities:10.04 Backfill:10.04.10 Gutter Drains System
10.00 Excavation/Utilities:10.04 Backfill:10.04.11 Drainage System
10.00 Excavation/Utilities:10.04 Backfill:10.04.2 Backfill Materials
10.00 Excavation/Utilities:10.04 Backfill:10.04.3 Backfill Labor
10.00 Excavation/Utilities:10.05 SWEP
10.00 Excavation/Utilities:10.06 Driveway Excavation
10.00 Excavation/Utilities:10.07 Base Prep
10.00 Excavation/Utilities:10.08 Excavation of Utilities
10.00 Excavation/Utilities:10.09 Utility Lines
10.00 Excavation/Utilities:10.09 Utility Lines:10.09.1 Sewer
10.00 Excavation/Utilities:10.09 Utility Lines:10.09.2 Water
10.00 Excavation/Utilities:10.09 Utility Lines:10.09.3 Gas
10.00 Excavation/Utilities:10.09 Utility Lines:10.09.4 Electrical
10.00 Excavation/Utilities:10.09 Utility Lines:10.09.5  Spare Conduits
10.00 Excavation/Utilities:10.10 Sewer Injector Pump
10.00 Excavation/Utilities:10.11 Septic Tanks
10.00 Excavation/Utilities:10.12 Grease Interceptor
10.00 Excavation/Utilities:10.13 Outdoor Lighting
10.00 Excavation/Utilities:10.14 Rock Walls
10.00 Excavation/Utilities:10.15 Finish Grading
10.00 Excavation/Utilities:10.16 Snow Removal
11.00 Foundation
11.00 Foundation:11.01 Foundation Fuel
11.00 Foundation:11.02 Foundation Subcontractor
11.00 Foundation:11.03 Basement
11.00 Foundation:11.03 Basement:11.03.01 Bsmt Labor
11.00 Foundation:11.03 Basement:11.03.02 Bsmt Materials
11.00 Foundation:11.03 Basement:11.03.03 Retaining Walls Lab
11.00 Foundation:11.03 Basement:11.03.04 Retaining Walls Mat
11.00 Foundation:11.04 Footing
11.00 Foundation:11.04 Footing:11.04.01 Footing Layout
11.00 Foundation:11.04 Footing:11.04.02 Footing Subcontractor
11.00 Foundation:11.04 Footing:11.04.03 Footing Labor
11.00 Foundation:11.04 Footing:11.04.04 Footing Materials
11.00 Foundation:11.05 Stem Wall
11.00 Foundation:11.05 Stem Wall:11.05.01 Stemwall Labor
11.00 Foundation:11.05 Stem Wall:11.05.02 Stemwall Mat
11.00 Foundation:11.05 Stem Wall:11.05.03 Concrete Walls Labor
11.00 Foundation:11.05 Stem Wall:11.05.04 Concrete Walls Mat
11.00 Foundation:11.05.3 Exterior Retaining
11.00 Foundation:11.06 Concrete Pump
11.00 Foundation:11.07 Slab
11.00 Foundation:11.07 Slab:11.07.01 Interior House Slab
11.00 Foundation:11.07 Slab:11.07.02 Interior Garage Slab
11.00 Foundation:11.07 Slab:11.07.03 Interior Basement Slab
11.00 Foundation:11.07 Slab:11.07.04 Interior Shower Slab
11.00 Foundation:11.08 AARX
11.00 Foundation:11.09 Foundation Insulation
11.00 Foundation:11.10 Foundation Waterproofing
11.00 Foundation:11.11 Concrete Grinding
11.00 Foundation:11.12 Mat'l On/Off & Cleanup
11.00 Foundation:11.13 Sandblasting
11.00 Foundation:11.14 Core Drilling
12.00 Framing
12.00 Framing:12.01 Framing Fuel
12.00 Framing:12.02 Framing Subcontractor
12.00 Framing:12.03 Framing
12.00 Framing:12.03 Framing:12.03.1 Framing Floor
12.00 Framing:12.03 Framing:12.03.1 Framing Floor:12.03.1.01 Mudsill
12.00 Framing:12.03 Framing:12.03.1 Framing Floor:12.03.1.02 Joist
12.00 Framing:12.03 Framing:12.03.1 Framing Floor:12.03.1.03 Sheathing
12.00 Framing:12.03 Framing:12.03.1 Framing Floor:12.03.1.03 Sheathing:12.03.2.03.1 Zip Coating
12.00 Framing:12.03 Framing:12.03.2 Frame Walls
12.00 Framing:12.03 Framing:12.03.2 Frame Walls:12.03.2.01 Frame Layout
12.00 Framing:12.03 Framing:12.03.2 Frame Walls:12.03.2.02 Plating
12.00 Framing:12.03 Framing:12.03.2 Frame Walls:12.03.2.02 Wall Framing
12.00 Framing:12.03 Framing:12.03.2 Frame Walls:12.03.2.03 Sheer Walls
12.00 Framing:12.03 Framing:12.03.3 Roof
12.00 Framing:12.03 Framing:12.03.3 Roof:12.03.3.01 Truss Mat
12.00 Framing:12.03 Framing:12.03.3 Roof:12.03.3.02 Truss Lab
12.00 Framing:12.03 Framing:12.03.3 Roof:12.03.3.03 Stick Frame Lab
12.00 Framing:12.03 Framing:12.03.3 Roof:12.03.3.04 Stick Frame Mat
12.00 Framing:12.03 Framing:12.03.3 Roof:12.03.3.05 Roof Sheething
12.00 Framing:12.03 Framing:12.03.3 Roof:12.03.3.05 Roof Sheething:12.03.3.05.1 Zip Coating
12.00 Framing:12.03 Framing:12.03.3 Roof:12.03.3.06 Crane/Lifts
12.00 Framing:12.03 Framing:12.03.4 Siding
12.00 Framing:12.03 Framing:12.03.4 Siding:12.03.4.01 Siding Labor
12.00 Framing:12.03 Framing:12.03.4 Siding:12.03.4.02 Siding Mat
12.00 Framing:12.03 Framing:12.03.4 Siding:12.03.4.03 Exterior Soffit Inst
12.00 Framing:12.03 Framing:12.03.5 Framing Pick Up
12.00 Framing:12.03 Framing:12.03.6 Framing Changes
12.00 Framing:12.03 Framing:12.03.9 Framing Extras
12.00 Framing:12.04 Lumber
12.00 Framing:12.04 Lumber:12.04.01 Floor Package
12.00 Framing:12.04 Lumber:12.04.02 Wall Package
12.00 Framing:12.04 Lumber:12.04.03 Sheer Package
12.00 Framing:12.04 Lumber:12.04.04 Roof Package
12.00 Framing:12.04 Lumber:12.04.05 Heavy Timber
12.00 Framing:12.04 Lumber:12.04.08 Extra Items
12.00 Framing:12.04 Lumber:12.04.09 Ext Soffit Material
12.00 Framing:12.04 Lumber:12.04.10 Interior Soffit
12.00 Framing:12.04 Lumber:12.04.10 Interior Soffit:12.04.10.1 Int Soffit Material
12.00 Framing:12.04 Lumber:12.04.10 Interior Soffit:12.04.10.2 Int Soffit Labor
12.00 Framing:12.04 Lumber:12.04.20 Custom Siding
12.00 Framing:12.04 Lumber:12.04.20 Custom Siding:12.04.20.1 Siding Ma
12.00 Framing:12.04 Lumber:12.04.20 Custom Siding:12.04.20.2 Siding Labor
12.00 Framing:12.05 Rough Hardware
12.00 Framing:12.06 Trusses
12.00 Framing:12.06 Trusses:12.06.1 Crane
12.00 Framing:12.06 Trusses:12.06.2 Truss Install Labor
12.00 Framing:12.06 Trusses:12.06.3 Truss Manufacurer
12.00 Framing:12.07.1 Concrete//Masonry Walls
12.00 Framing:12.07.1 Concrete//Masonry Walls:12.07.01 CMU Subcontractor
12.00 Framing:12.07.1 Concrete//Masonry Walls:12.07.02 Stone Subcontractor
12.00 Framing:12.07.1 Concrete//Masonry Walls:12.07.03  Grout
12.00 Framing:12.07.1 Concrete//Masonry Walls:12.07.2 ICF
12.00 Framing:12.07.1 Concrete//Masonry Walls:12.07.2 ICF:12.07.2.1 ICF Materials
12.00 Framing:12.07.1 Concrete//Masonry Walls:12.07.2 ICF:12.07.2.2 ICF Concrete Bucks
12.00 Framing:12.07.1 Concrete//Masonry Walls:12.07.2 ICF:12.07.2.3 ICF Labor
12.00 Framing:12.07.1 Concrete//Masonry Walls:12.07.2 ICF:12.07.2.4 ICF Sub
12.00 Framing:12.07.1 Concrete//Masonry Walls:12.07.2 ICF:12.07.2.5 ICF Extra
12.00 Framing:12.08 Sandblast
12.00 Framing:12.08 Sandblast:12.08.01 Sandblast Masonry
12.00 Framing:12.08 Sandblast:12.08.02 Sandblast Steel
12.00 Framing:12.09 Structural Steel
12.00 Framing:12.09 Structural Steel:12.09.00 Shop Drawings
12.00 Framing:12.09 Structural Steel:12.09.01 Welding Labor Only
12.00 Framing:12.09 Structural Steel:12.09.02 Steel Fabrication Lab
12.00 Framing:12.09 Structural Steel:12.09.03 Installation Labor
12.00 Framing:12.09 Structural Steel:12.09.04 Steel Material
12.00 Framing:12.09 Structural Steel:12.09.04 Structural Material
12.00 Framing:12.09 Structural Steel:12.09.10 Steel Framing Extras
12.00 Framing:12.09 Structural Steel:12.09.13 Steel Railings
12.00 Framing:12.09 Structural Steel:12.09.14 Steel Stairs
12.00 Framing:12.09 Structural Steel:12.09.15 Crane/Forklift
12.00 Framing:12.09 Structural Steel:12.09.2 Metal Siding
12.00 Framing:12.09 Structural Steel:12.09.3 Ext Steel Detailing
12.00 Framing:12.19 Architectural Steel
12.00 Framing:12.19 Architectural Steel:12.09.41 Steel BBQ
12.00 Framing:12.19 Architectural Steel:12.09.42 Steel Planter
12.00 Framing:12.19 Architectural Steel:12.09.43 Steel Wood Box
12.00 Framing:12.19 Architectural Steel:12.09.44 Interior Steel Benches
12.00 Framing:12.19 Architectural Steel:12.09.45 Steel Enclosure Conden
12.00 Framing:12.19 Architectural Steel:12.09.46 Steel Window Sills
12.00 Framing:12.19 Architectural Steel:12.09.49 Interior Steel Adds
12.00 Framing:12.20 Permalack Steel
12.00 Framing:12.21 Weld Special Inspection
12.090.16
13.00 Plumbing
13.00 Plumbing:13.00 Plumbing
13.00 Plumbing:13.01 Plumbing Subcontractor
13.00 Plumbing:13.01.1 Plumbing Top Out
13.00 Plumbing:13.02 Plumbing Fixtures
13.00 Plumbing:13.03 Water Softener
13.00 Plumbing:13.04 Interior Bath Accessories
13.00 Plumbing:13.05 Plumbing Extras
13.00 Plumbing:13.06 Radiant Floor Heating
13.00 Plumbing:13.06 Radiant Floor Heating:13.06.01 Radiant Heat
13.00 Plumbing:13.06 Radiant Floor Heating:13.06.02 Radiant Cooling
13.00 Plumbing:13.06 Radiant Floor Heating:13.06.03 Garage Heating
13.00 Plumbing:13.06 Radiant Floor Heating:13.06.04 Driveway Heating
13.00 Plumbing:13.06 Radiant Floor Heating:13.06.05 Radiant Additions
13.00 Plumbing:13.06 Radiant Floor Heating:13.06.06 Excavation Fields
13.00 Plumbing:13.06 Radiant Floor Heating:13.06.07 Pool Hydronics
13.00 Plumbing:13.06 Radiant Floor Heating:13.06.09 Radiant Insulation
13.00 Plumbing:13.07 Fire Protection - Sprinkl
13.00 Plumbing:13.10 Plumbing Trenches
14.00 HVAC
14.00 HVAC:14.01 HVAC Subcontractor
14.00 HVAC:14.01.1 HVAC ERV Systems
14.00 HVAC:14.02 HVAC
14.00 HVAC:14.03 Air Conditioning - Subcon
14.00 HVAC:14.04 Kitchen Hood
14.00 HVAC:14.05 Crawl Space Venting
14.00 HVAC:14.09 HVAC Additions
15.00 Electrical
15.00 Electrical:15.01 Electrical Subcontractor
15.00 Electrical:15.02 Electrical
15.00 Electrical:15.03 Electrical Fixtures
15.00 Electrical:15.03 Electrical Fixtures:15.03.1 Electrical Can Lights
15.00 Electrical:15.03 Electrical Fixtures:15.03.2 Designer Fixtures
15.00 Electrical:15.04 Solar
15.00 Electrical:15.05 Low Voltage
15.00 Electrical:15.05 Low Voltage:15.05.01 Low Voltage Sub
15.00 Electrical:15.05 Low Voltage:15.05.1 Vacuum
15.00 Electrical:15.05 Low Voltage:15.05.2 Sound
15.00 Electrical:15.05 Low Voltage:15.05.3 Cabinet Lighting
15.00 Electrical:15.05 Low Voltage:15.05.4 Blind Wiring
15.00 Electrical:15.05 Low Voltage:15.05.5 Theater
15.00 Electrical:15.05 Low Voltage:15.05.6 Security
15.00 Electrical:15.06 Generator/Backup System
16.00 Concrete Work
16.00 Concrete Work:16.01 Concrete Flatwork
16.00 Concrete Work:16.01 Concrete Flatwork:16.01.01 Underslab Insulation
16.00 Concrete Work:16.01 Concrete Flatwork:16.01.1 Garage Slab
16.00 Concrete Work:16.01 Concrete Flatwork:16.01.2 Sidewalks
16.00 Concrete Work:16.01 Concrete Flatwork:16.01.3 Porches
16.00 Concrete Work:16.01 Concrete Flatwork:16.01.3 Porches:16.01.31 Steps
16.00 Concrete Work:16.01 Concrete Flatwork:16.01.4 Patios
16.00 Concrete Work:16.01 Concrete Flatwork:16.01.5 Driveway
16.00 Concrete Work:16.01 Concrete Flatwork:16.01.7 Underfloor Slab
16.00 Concrete Work:16.01 Concrete Flatwork:16.01.8 Basement Slab
16.00 Concrete Work:16.01 Concrete Flatwork:16.01.9 Interior Slab
16.00 Concrete Work:16.01.6 Slab Base Prep
16.00 Concrete Work:16.01.7 Concrete Decks
16.00 Concrete Work:16.02 Concrete - Subcontractor
17.00 Windows
17.00 Windows:17.01 Window Subcontractor
17.00 Windows:17.02 Windows
17.00 Windows:17.02 Windows:17.02.1 Window Installation
17.00 Windows:17.02 Windows:17.02.2 Paint/Stain Windows
17.00 Windows:17.02 Windows:17.02.3 Temp Window Covering
17.00 Windows:17.03 Skylights
17.00 Windows:17.04 Interior Glass
17.00 Windows:17.05 Window Demolition
17.00 Windows:17.06 Saw Cut Windows
17.00 Windows:17.07 Window Coverings
18.00 Roofing
18.00 Roofing:18.01 Roofing
18.00 Roofing:18.01.1 Roofing Materials
18.00 Roofing:18.01.2 Roofing Subcontractor
18.00 Roofing:18.01.3 Roofing Labor Other
18.00 Roofing:18.02 Roofing
18.00 Roofing:18.03 Roofing Foam Underlayment
18.00 Roofing:18.04 Roof Flashing
18.00 Roofing:18.05 Roof Decks
18.00 Roofing:18.06 Roof Deck Waterproofing
18.00 Roofing:18.07 Roof Gutters
18.00 Roofing:18.07 Roof Gutters:18.07.01 Ice Melt
19.00 Stucco & Stone
19.00 Stucco & Stone:19.01 Stucco Subcontractor
19.00 Stucco & Stone:19.02 Stucco Stone
19.00 Stucco & Stone:19.03 Lath
19.00 Stucco & Stone:19.04 Interior Plaster
19.00 Stucco & Stone:19.05 Stucco Painting
2.00 Professional Services
2.00 Professional Services:2.01 Architect & Design
2.00 Professional Services:2.02 Structural Engineering
2.00 Professional Services:2.03 Plot Plan
2.00 Professional Services:2.04 Soil Engineering
2.00 Professional Services:2.05 Survey
2.00 Professional Services:2.06 Finish Grade Survey & Lett
2.00 Professional Services:2.07 Special Inspections
2.00 Professional Services:2.08 Design Consult
20.00 Insulation
20.00 Insulation:20.01 Insulation Subcontractor
20.00 Insulation:20.02 Insulation
20.00 Insulation:20.02 Insulation:20.02.01 Insulation Labor
20.00 Insulation:20.02 Insulation:20.02.02 Insulation Mat
20.00 Insulation:20.03 Foundation
20.00 Insulation:20.03 Foundation:20.03.01 Waterproof Mat
20.00 Insulation:20.03 Foundation:20.03.02 Waterproof Lab
20.00 Insulation:20.03 Foundation:20.03.03 Insulation Mat
20.00 Insulation:20.03 Foundation:20.03.04 Insulation Lab
21.00 Sheet Rock
21.00 Sheet Rock:21.01 Sheet Rock
21.00 Sheet Rock:21.01 Sheet Rock:21.01.1 Hanging
21.00 Sheet Rock:21.01 Sheet Rock:21.01.2 Taping
21.00 Sheet Rock:21.01 Sheet Rock:21.01.3 Ringlet & Corners
21.00 Sheet Rock:21.01 Sheet Rock:21.01.4 Scrapping
21.00 Sheet Rock:21.01 Sheet Rock:21.01.5 Temp Heat
21.00 Sheet Rock:21.01 Sheet Rock:21.01.6 Patching
21.00 Sheet Rock:21.02 Sheet Rock Subcontractor
21.00 Sheet Rock:21.03 FRP Installation
21.00 Sheet Rock:21.04 Exterior Fire Rock
21.00 Sheet Rock:21.05 T-Bar
22.00 Fireplaces
22.00 Fireplaces:22.01 Fireplaces Subcontractor
22.00 Fireplaces:22.02 Chimney Caps
22.00 Fireplaces:22.03 Fireplace Heat Wall
22.00 Fireplaces:22.04 Steel Flu
22.00 Fireplaces:22.05 Fireplace Material
23.00 Doors
23.00 Doors:23.01 Exterior Doors
23.00 Doors:23.01 Exterior Doors:23.01.01 Front Door
23.00 Doors:23.01 Exterior Doors:23.01.02 Exterior Door
23.00 Doors:23.01 Exterior Doors:23.01.03 Temp Doors
23.00 Doors:23.01 Exterior Doors:23.01.1 Ext Installation Labor
23.00 Doors:23.02 Door Installation Labor
23.00 Doors:23.03 Interior Doors
23.00 Doors:23.03 Interior Doors:23.03.01 Interior Door
23.00 Doors:23.03 Interior Doors:23.03.02 Pocket Door
23.00 Doors:23.03 Interior Doors:23.03.03 Barn Door
23.00 Doors:23.03 Interior Doors:23.03.1 Int Installation Labor
23.00 Doors:23.04 Garage Doors
23.00 Doors:23.06 Door Locks
23.00 Doors:23.06 Door Locks:23.06.01  Door Locks Labor
23.00 Doors:23.06 Door Locks:23.06.02  Door Locks Materials
24.00 Interior Finish Work
24.00 Interior Finish Work:24.01 Interior Trim
24.00 Interior Finish Work:24.01 Interior Trim:24.01.1 Interior Base
24.00 Interior Finish Work:24.01 Interior Trim:24.01.2 Interior Shelving
24.00 Interior Finish Work:24.01 Interior Trim:24.01.3 Interior Window/Door Ca
24.00 Interior Finish Work:24.01 Interior Trim:24.01.4 Interior Wall Panel
24.00 Interior Finish Work:24.01 Interior Trim:24.10 Interior Trim Labor
24.00 Interior Finish Work:24.04 Field Built Cabinets
24.00 Interior Finish Work:24.04 Field Built Cabinets:24.04.1 Cabinet Materials
24.00 Interior Finish Work:24.04 Field Built Cabinets:24.04.2 Cabinet Manufacturing
24.00 Interior Finish Work:24.04 Field Built Cabinets:24.04.3 Cabinet Assembly
24.00 Interior Finish Work:24.04 Field Built Cabinets:24.04.4 Cabinet Install
24.00 Interior Finish Work:24.04 Field Built Cabinets:24.04.5 Cabinet Staining
24.00 Interior Finish Work:24.05 Custom Finish Work
24.00 Interior Finish Work:24.05 Custom Finish Work:24.05.01 Bunk Beds
24.00 Interior Finish Work:24.05 Custom Finish Work:24.05.02
24.00 Interior Finish Work:24.05 Custom Finish Work:24.05.03 Garage Cabinet
24.00 Interior Finish Work:24.05 Custom Finish Work:24.05.04 Custom Wall Paneling
24.00 Interior Finish Work:24.05 Custom Finish Work:24.05.05 Custom Closet
24.00 Interior Finish Work:24.06 Cabinets
24.00 Interior Finish Work:24.06 Cabinets:24.06.01 Cabinet Design
24.00 Interior Finish Work:24.06 Cabinets:24.06.02 Cabinet Purchase
24.00 Interior Finish Work:24.06 Cabinets:24.06.03 Cabinet Installation
24.00 Interior Finish Work:24.06 Cabinets:24.06.04 Cabinet Hardware
24.00 Interior Finish Work:24.06 Cabinets:24.06.4 Cabinetry Plywood
24.00 Interior Finish Work:24.06 Cabinets:24.06.42 Custom Cab
24.00 Interior Finish Work:24.06 Cabinets:DUP 24.06.42 Custom
24.00 Interior Finish Work:24.07 Finish Wood Ceilings
24.00 Interior Finish Work:24.07 Finish Wood Ceilings:24.07.1 Wood Ceilings Labor
24.00 Interior Finish Work:24.07 Finish Wood Ceilings:24.07.2  Wood Ceilings Stain La
24.00 Interior Finish Work:24.07 Finish Wood Ceilings:24.07.3  Wood Ceilings Material
24.00 Interior Finish Work:24.08 Finish Hardware
24.00 Interior Finish Work:24.08 Finish Hardware:24.08.05 Murphy Bed
24.00 Interior Finish Work:24.08 Finish Hardware:24.08.1 Electronic Locks
24.00 Interior Finish Work:24.08 Finish Hardware:24.08.2 Handicap Hardware
25.00 Counters
25.00 Counters:25.01 Granite Countertop
25.00 Counters:25.01 Granite Countertop:25.01.1 Granite  Materials
25.00 Counters:25.01 Granite Countertop:25.01.2 Granite  Labor/Sub
25.00 Counters:25.02 Siltstone/Caesar stone Co
25.00 Counters:25.03 Marble Countertop
25.00 Counters:25.04 Concrete Countertop
25.00 Counters:25.05 Wood Countertop
25.00 Counters:25.06 Steel Countertop
25.00 Counters:25.07 Lamanent Countertop
25.00 Counters:25.08 Back Splash
25.00 Counters:25.09 Stone Mantles and Post
26.00 Painting
26.00 Painting:26.01 Exterior Painting
26.00 Painting:26.01 Exterior Painting:26.01.1 Exterior Paint Labor
26.00 Painting:26.01 Exterior Painting:26.01.2 Exterior Paint Mat
26.00 Painting:26.02 Interior Painting
26.00 Painting:26.02 Interior Painting:26.02.1 Interior Paint Labor
26.00 Painting:26.02 Interior Painting:26.02.2 Interior Paint Mat
26.00 Painting:26.03 Staining
26.00 Painting:26.03 Staining:26.03 Int Door Staining
26.00 Painting:26.03 Staining:26.03.10 Exterior Staining Lab
26.00 Painting:26.03 Staining:26.03.11 Exterior Staining Mat
26.00 Painting:26.03 Staining:26.03.20 Interior Staining Lab
26.00 Painting:26.03 Staining:26.03.21 Interior Staining Mat
26.00 Painting:26.04 Permacoat Steel
26.00 Painting:26.05 Wallpaper
26.00 Painting:26.06 Painting Windows
26.00 Painting:26.10 Inteior Painting
26.00 Painting:26.20 Painting Subcontractor
27.00 Tile
27.00 Tile:27.01 Tile
27.00 Tile:27.01 Tile:27.01.01 Tile Set Labor
27.00 Tile:27.01 Tile:27.01.02 Tile Material
27.00 Tile:27.01 Tile:27.01.03 Shower Pan Materials
27.00 Tile:27.01 Tile:27.01.04 Shower Pan Labor
27.00 Tile:27.01 Tile:27.01.05 Tile Walls Labor
27.00 Tile:27.01 Tile:DUP 27.01.06 Tile Walls Mat
27.00 Tile:27.02 Tile - Subcontractor
27.00 Tile:27.03 Stone Fireplace
28.00 Driveway/Landscaping/Deck
28.00 Driveway/Landscaping/Deck:28.01 Driveway Removal
28.00 Driveway/Landscaping/Deck:28.02 Paver/Asphalt Driveway
28.00 Driveway/Landscaping/Deck:28.02 Paver/Asphalt Driveway:28.02.1 Concrete
28.00 Driveway/Landscaping/Deck:28.02 Paver/Asphalt Driveway:28.02.2 Pavers
28.00 Driveway/Landscaping/Deck:28.02 Paver/Asphalt Driveway:28.02.4 Rock/Gravel
28.00 Driveway/Landscaping/Deck:28.03 Paver Patio
28.00 Driveway/Landscaping/Deck:28.03 Paver Patio:28.03.01 Raised Paver Patio Mat
28.00 Driveway/Landscaping/Deck:28.03 Paver Patio:28.03.02 Raised Paver Patio Lab
28.00 Driveway/Landscaping/Deck:28.04 Planters
28.00 Driveway/Landscaping/Deck:28.05 Landscaping
28.00 Driveway/Landscaping/Deck:28.06 Landscape Curbing
28.00 Driveway/Landscaping/Deck:28.07 Retaining Walls
28.00 Driveway/Landscaping/Deck:28.08 Decks
28.00 Driveway/Landscaping/Deck:28.08 Decks:28.08.1 Deck Furniture
28.00 Driveway/Landscaping/Deck:28.09 Exterior Railing
28.00 Driveway/Landscaping/Deck:28.09 Exterior Railing:28.09.1 Exterior Wall Caps
28.00 Driveway/Landscaping/Deck:28.10 Metal Gates
28.00 Driveway/Landscaping/Deck:28.10 Metal Gates:28.01 Gate Build Labor
28.00 Driveway/Landscaping/Deck:28.10 Metal Gates:28.10 Gates Opener
28.00 Driveway/Landscaping/Deck:28.11 Fencing
28.00 Driveway/Landscaping/Deck:28.12 Mailbox Installation
28.00 Driveway/Landscaping/Deck:28.14 Patio Heaters
28.00 Driveway/Landscaping/Deck:28.15 BBQ Area
28.00 Furnishings
29.00 Flooring
29.00 Flooring:29.01 Carpet
29.00 Flooring:29.02 Hardwood
29.00 Flooring:29.02 Hardwood:29.02.1 Hardwood Install
29.00 Flooring:29.02 Hardwood:29.02.2 Hardwood Material
29.00 Flooring:29.02 Hardwood:29.02.3 Hardwood Stairs
29.00 Flooring:29.03 Terrazzo
29.00 Flooring:29.04 Vinyl
29.00 Flooring:29.04 Vinyl:29.04.01 Rubber Base
29.00 Flooring:29.05 Gyp-Crete
29.00 Flooring:29.06 Cover Floors w/ Paper
29.00 Flooring:29.07 Grind & Polish Concrete F
29.00 Flooring:29.07.01 Epoxy Floor
3.00 Project Planning
3.00 Project Planning:3.01 Blueprints
3.00 Project Planning:3.02 Plan-Takeoffs/Bids/Budgets
3.00 Project Planning:3.03 Bonds
3.00 Project Planning:3.04 Attorney
3.00 Project Planning:3.05 Insurance
3.00 Project Planning:3.06 Travel Costs
3.00 Project Planning:3.07 Plan Fees to City/Gov Enti
3.00 Project Planning:3.08 Cost Carryover Prior
30.00 Mirrors & Shower Doors
30.00 Mirrors & Shower Doors:30.01 Mirrors
30.00 Mirrors & Shower Doors:30.02 Shower Doors
31.00 Construction Cleaning & D
31.00 Construction Cleaning & D:31.01 Construction Cleanup
31.00 Construction Cleaning & D:31.02 Cleaning Materials/Produc
31.00 Construction Cleaning & D:31.03 Dumpsters
31.00 Construction Cleaning & D:31.04 Final Cleaning
31.00 Construction Cleaning & D:31.04 Final Cleaning:31.04.1 Window Washing
31.00 Construction Cleaning & D:31.05 Floor Scraping & Cleaning
31.00 Construction Cleaning & D:31.09 Moving Furniture
31.00 Construction Cleaning & D:31.11 Material Running
32.00 Temporary Services
32.00 Temporary Services:32.01 Power
32.00 Temporary Services:32.02 Restroom
32.00 Temporary Services:32.03 Gasoline
32.00 Temporary Services:32.04 Water
32.00 Temporary Services:32.05 Temp. Facilities
32.00 Temporary Services:32.06 Equipment
32.00 Temporary Services:32.07 Temporary Fencing
32.00 Temporary Services:32.08 Sign
32.00 Temporary Services:32.09 Telephone
32.00 Temporary Services:32.10 Alarm Monitoring
32.00 Temporary Services:32.11 Site Security
34.00 Contingency
34.00 Contingency:34.01 Contingency
35.00 Appliances
35.00 Appliances:35.01 Appliances
35.00 Appliances:35.01 Appliances:35.01.1 Appliance Installation
35.00 Appliances:35.01 Appliances:35.01.2 Refrigerator
35.00 Appliances:35.01 Appliances:35.01.3 Ovens
35.00 Appliances:35.01 Appliances:35.01.4 Range
35.00 Appliances:35.01 Appliances:35.01.5 Hood
35.00 Appliances:35.01 Appliances:35.01.6 Dishwasher
35.00 Appliances:35.01 Appliances:35.01.7 Microwave
35.00 Appliances:35.01 Appliances:35.01.8 Laundry Appliances
35.00 Appliances:35.01.9 Interior Design Furnish
35.00 Appliances:35.02 Elevator Install
35.00 Appliances:35.03 Wine Cooler and Install
35.00 Appliances:35.03 Wine Cooler and Install:35.03.0 Wine Cooler Walls
36.00 Interior Stairs & Railing
36.00 Interior Stairs & Railing:36.01 Interior Stair
36.00 Interior Stairs & Railing:36.01 Interior Stair:36.01.0 Tread Labor
36.00 Interior Stairs & Railing:36.01 Interior Stair:36.01.02 Tread Material
36.00 Interior Stairs & Railing:36.02 Interior Railing
36.00 Interior Stairs & Railing:36.03 Railing
37.00 Fire Sprinklers
37.00 Fire Sprinklers:37.01 Fire Sprinkler Offsite
37.00 Fire Sprinklers:37.02 Fire Sprinkler Onsite
37.00 Fire Sprinklers:37.03 Fire Sprinkler Subcontrac
38.00 Pool & Spa
38.00 Pool & Spa:38.01.1 Pool Labor
38.00 Pool & Spa:38.01.2 Pool Materials
38.00 Pool & Spa:38.01.3 Pool Equipment
38.00 Pool & Spa:38.02.1 Spa Materials
38.00 Pool & Spa:38.02.2 Spa Labor
38.00 Pool & Spa:38.03 Sauna
4.00 Permits & Fees
4.00 Permits & Fees:4.01 Permits
4.00 Permits & Fees:4.02 Architectural Committee Fe
4.00 Permits & Fees:4.03 Water Rights/Water Fees
4.00 Permits & Fees:4.04 Sewer Fees
4.00 Permits & Fees:4.05 Electrical Fees/Deposits
4.00 Permits & Fees:4.06 Construction Deposit
40.00 Warranty
40.00 Warranty:40.01 Warranty
40.00 Warranty:40.02 Maintenance
40.00 Warranty:40.03 Repair
48.00 Profit
48.00 Profit:48.01 Profit
48.00 Profit:48.01 Profit:48.01.01 Realtor referral com
48.00 Profit:48.02 Money Credited
49.00 Change Orders
49.00 Change Orders:49.01 Change Order #1
49.00 Change Orders:49.02 Change Order #2
49.00 Change Orders:49.03 Change Order #3
49.00 Change Orders:49.04 Change Order #4
49.00 Change Orders:49.05 Change Order #5
49.00 Change Orders:49.06 Change Order #6
49.00 Change Orders:49.07 Change Order #7
49.00 Change Orders:49.08 Change Order #8
49.00 Change Orders:49.09 Change Order #9
49.00 Change Orders:49.10 Change Order #10
49.00 Change Orders:49.11 Change Order #11
49.00 Change Orders:49.12 Change Order #12
49.00 Change Orders:49.13 Change Order #13
49.00 Change Orders:49.14 Change Order #14
49.00 Change Orders:49.15 Change Order #15
49.00 Change Orders:49.16 Change Order #16
49.00 Change Orders:49.17 Change Order #17
49.00 Change Orders:49.18 Change Order #18
49.00 Change Orders:49.19 Change Order #19
49.00 Change Orders:49.20 Change Order #20
49.00 Change Orders:49.21 Change Order #21
49.00 Change Orders:49.22 Change Order #22
49.00 Change Orders:49.23 Change Order #23
49.00 Change Orders:49.24 Change Order #24
49.00 Change Orders:49.25 Change Order #25
49.00 Change Orders:49.49 Extra Cabinet Work
5.00 Construction Loans
5.00 Construction Loans:5.01 Bank Loan Fees
5.00 Construction Loans:5.01 Bank Loan Fees:5.01.1 Builder Control Fees
5.00 Construction Loans:5.01 Bank Loan Fees:5.01.2 Flood Fee
5.00 Construction Loans:5.01 Bank Loan Fees:5.01.3 Title Fees
5.00 Construction Loans:5.01 Bank Loan Fees:5.01.4 Appraisal
5.00 Construction Loans:5.01 Bank Loan Fees:5.01.5 Interest
5.00 Construction Loans:5.02 Inspection Fees
5.00 Construction Loans:5.03 Loan Insurance
5.00 Construction Loans:5.04 Escrows
5.00 Construction Loans:5.04 Escrows:5.04.1 Final COE Costs
5.00 Construction Loans:5.04 Escrows:5.04.2 2/10 Insurance
5.00 Construction Loans:5.04 Escrows:5.04.3 Commissions
6.00 Overhead/Supervision
6.00 Overhead/Supervision:6.01 Overhead Fuel
6.00 Overhead/Supervision:6.02 Overhead Expenses
6.00 Overhead/Supervision:6.03 Accting/Clerical Office Wo
6.00 Overhead/Supervision:6.04 Supervision
6.00 Overhead/Supervision:6.05 Start Up / Mobilize
6.00 Overhead/Supervision:6.06 Owner Meeting
6.00 Overhead/Supervision:6.07 General Condition
6.00 Overhead/Supervision:6.07 General Condition:6.07.01 Office Expense
6.00 Overhead/Supervision:6.07 General Condition:6.07.02 Auto Expense
6.00 Overhead/Supervision:6.07 General Condition:6.07.03 Equiptment Rental
6.00 Overhead/Supervision:6.07 General Condition:6.07.04 Employee Holiday
6.00 Overhead/Supervision:6.08 General Labor
6.10 1% Overhead Fee
7.00 Construction Insurance
7.00 Construction Insurance:7.01 Liability Insurance
7.00 Construction Insurance:7.02 Builders Risk Insurance
7.00 Construction Insurance:7.03 Vehicle Insurance
7.00 Construction Insurance:7.04 Equipment Insurance
8.00 Demolition
8.00 Demolition:8.01 Demolition Exterior
8.00 Demolition:8.01 Demolition Exterior:8.01.01 Pre-Demo
8.00 Demolition:8.01 Demolition Exterior:8.01.1 Demo- Demo Cost
8.00 Demolition:8.01 Demolition Exterior:8.01.2 Demo - Debri Removal
8.00 Demolition:8.01 Demolition Exterior:8.01.3 Demo - Concete Removal
8.00 Demolition:8.01 Demolition Exterior:8.01.4 Demo - Stump Removal
8.00 Demolition:8.02 Demolition Interior
8.00 Demolition:8.02 Demolition Interior:8.02 Tear down-walls/cabinets/c
8.00 Demolition:8.03 Remove debris / dump runs
8.00 Demolition:8.04 Demolition Electrical
8.00 Demolition:8.05 Demolition Bathroom
9.00 Site Work
9.00 Site Work:9.01 Site Work Fuel
9.00 Site Work:9.02 Site Work Subcontractor
9.00 Site Work:9.03 Clearing
9.00 Site Work:9.04 Compaction
9.00 Site Work:9.05 Erosion Control
9.00 Site Work:9.06 Fine Grading
9.00 Site Work:9.07 Gabion’s
9.00 Site Work:9.07 Gabion’s:9.07.2 Gabion Wall Labor
9.00 Site Work:9.08 Haul Offsite
9.00 Site Work:9.09 Street Cuts
9.00 Site Work:9.10 Retention Basins
9.00 Site Work:9.11 Site Excavation
9.00 Site Work:9.12 Offsite Utilities
9.00 Site Work:9.12 Offsite Utilities:9.12.1 Offsite Sewer
9.00 Site Work:9.12 Offsite Utilities:9.12.2 Offsite Water
9.00 Site Work:9.12 Offsite Utilities:9.12.3 Offsite Gas
9.00 Site Work:9.12 Offsite Utilities:9.12.4 Offsite Electrical
9.00 Site Work:9.13 Strip Topsoil
9.00 Site Work:9.14 Trenching
9.00 Site Work:9.15 Dust Control/Water
9.00 Site Work:9.16 Sidewalks & Curbs
Reimb Subt
`
function cleanLabel(value: string) {
  return value
    .replace(/^DUP\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
}

function parseCostCodeLine(line: string): CostCode | null {
  const fullPath = line.trim()

  if (!fullPath) return null

  const pathParts = fullPath.split(":").map((part) => part.trim())
  const leaf = cleanLabel(pathParts[pathParts.length - 1] || fullPath)

  const match = leaf.match(/^([0-9]+(?:\.[0-9]+)*)(?:\s+(.+))?$/)

  if (!match) return null

  const code = match[1]
  const label = cleanLabel(match[2] || code)

  return {
    code,
    label,
    fullPath,
  }
}

function dedupeCostCodes(costCodes: CostCode[]): CostCode[] {
  const seen = new Set<string>()
  const uniqueCostCodes: CostCode[] = []

  for (const costCode of costCodes) {
    const key = `${costCode.code}|${costCode.label}|${costCode.fullPath}`

    if (!seen.has(key)) {
      seen.add(key)
      uniqueCostCodes.push(costCode)
    }
  }

  return uniqueCostCodes
}

const parsedCostCodes = COST_CODE_RAW.split(/\r?\n/)
  .map((line) => parseCostCodeLine(line))
  .filter((costCode): costCode is CostCode => costCode !== null)

export const COST_CODES: CostCode[] = dedupeCostCodes(parsedCostCodes)

export function findCostCodeByCode(code: string | null | undefined): CostCode | null {
  if (!code) return null

  return COST_CODES.find((costCode) => costCode.code === code) || null
}

export function findCostCodeByFullPath(fullPath: string | null | undefined): CostCode | null {
  if (!fullPath) return null

  return COST_CODES.find((costCode) => costCode.fullPath === fullPath) || null
}