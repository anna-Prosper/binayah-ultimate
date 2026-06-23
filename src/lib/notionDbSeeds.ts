import type { DbColumn } from "@/lib/data";

export type NotionDbSeed = {
  name: string;
  icon: string;
  columns: DbColumn[];
  dedupe: string[];
  idBase: number;
  rows: Record<string, string>[];
};

export const NOTION_DB_SEEDS = [
  {
    "name": "Projects Update",
    "icon": "🗃️",
    "columns": [
      {
        "id": "project_name",
        "name": "Project name",
        "type": "text",
        "width": 260
      },
      {
        "id": "project_date",
        "name": "Project date",
        "type": "date",
        "width": 140
      },
      {
        "id": "status",
        "name": "Status",
        "type": "status",
        "width": 110,
        "options": [
          "New",
          "Old"
        ]
      },
      {
        "id": "project_detail",
        "name": "Project detail",
        "type": "text",
        "width": 320
      },
      {
        "id": "url",
        "name": "URL",
        "type": "url",
        "width": 260
      },
      {
        "id": "created_by",
        "name": "Created by",
        "type": "user",
        "width": 160
      }
    ],
    "dedupe": [
      "project_name",
      "project_date",
      "project_detail",
      "url"
    ],
    "rows": [
      {
        "project_name": "Greenz by Danube",
        "created_by": "prajeesh",
        "project_date": "2026-03-22",
        "project_detail": "Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/greenz-by-danube/"
      },
      {
        "project_name": "Casa Altia",
        "created_by": "zahaib",
        "project_date": "2026-03-24",
        "project_detail": "Info + images updated",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/casa-altia-at-al-furjan/"
      },
      {
        "project_name": "Greenz by danube",
        "created_by": "zahaib",
        "project_date": "2026-03-24",
        "project_detail": "AI content added + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/greenz-by-danube/"
      },
      {
        "project_name": "Greenz by danube",
        "created_by": "zahaib",
        "project_date": "2026-03-24",
        "project_detail": "Floor plan page",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/greenz-by-danube/"
      },
      {
        "project_name": "Golf Fields by Emaar",
        "created_by": "zahaib",
        "project_date": "2026-03-24",
        "project_detail": "Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/golf-feilds-by-emaar/"
      },
      {
        "project_name": "Golf Vale by Emaar",
        "created_by": "nida",
        "project_date": "2026-03-24",
        "project_detail": "Floor Plan Images Extraction and adding",
        "status": "New",
        "url": ""
      },
      {
        "project_name": "Greenz By Danube",
        "created_by": "nida",
        "project_date": "2026-03-24",
        "project_detail": "Added content for main and inner pages provided by Content Writer",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/greenz-by-danube/"
      },
      {
        "project_name": "Ayami Residences",
        "created_by": "nida",
        "project_date": "2026-03-24",
        "project_detail": "Ayami residences Content entry for main page and inner pages",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/ayami-residence/"
      },
      {
        "project_name": "Ayami Residences",
        "created_by": "nida",
        "project_date": "2026-03-24",
        "project_detail": "Ayami Residences Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/ayami-residence/"
      },
      {
        "project_name": "Greenz by Danube",
        "created_by": "zahaib",
        "project_date": "2026-03-25",
        "project_detail": "Video added + Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/greenz-by-danube/"
      },
      {
        "project_name": "Greenz by Danube",
        "created_by": "zahaib",
        "project_date": "2026-03-25",
        "project_detail": "Video page",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/greenz-by-danube/video/"
      },
      {
        "project_name": "Greenz by Danube",
        "created_by": "nida",
        "project_date": "2026-03-25",
        "project_detail": "Image extraction from Brochure and added to project gallery",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/greenz-by-danube/"
      },
      {
        "project_name": "Golf Feilds by Emaar",
        "created_by": "zahaib",
        "project_date": "2026-03-25",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/golf-feilds-by-emaar/"
      },
      {
        "project_name": "Lavita at the Oasis",
        "created_by": "zahaib",
        "project_date": "2026-03-25",
        "project_detail": "Video Page",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/lavita-at-the-oasis/video/"
      },
      {
        "project_name": "Golf Fields by Emaar",
        "created_by": "nida",
        "project_date": "2026-03-25",
        "project_detail": "Content added for main project page + create inner pages",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/golf-feilds-by-emaar/"
      },
      {
        "project_name": "Golf Fields by Emaar",
        "created_by": "nida",
        "project_date": "2026-03-25",
        "project_detail": "Floor Plan Page",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/golf-fields-by-emaar/"
      },
      {
        "project_name": "Stories by Mirfa",
        "created_by": "zahaib",
        "project_date": "2026-03-26",
        "project_detail": "Draft + content Missing",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/stories-by-mirfa/"
      },
      {
        "project_name": "Stories by Mirfa IBC",
        "created_by": "nida",
        "project_date": "2026-03-26",
        "project_detail": "Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/stories-by-mirfa-ibc/"
      },
      {
        "project_name": "O1NE District Dawn at Motor City",
        "created_by": "nida",
        "project_date": "2026-03-26",
        "project_detail": "Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/o1ne-district-dawn-at-motor-city/"
      },
      {
        "project_name": "Casa Altia at Al Furjan",
        "created_by": "nida",
        "project_date": "2026-03-26",
        "project_detail": "Content adding and create inner pages",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/casa-altia-at-al-furjan/"
      },
      {
        "project_name": "Casa Altia at Al Furjan",
        "created_by": "nida",
        "project_date": "2026-03-26",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/casa-altia/"
      },
      {
        "project_name": "AYS Developers",
        "created_by": "nida",
        "project_date": "2026-03-26",
        "project_detail": "Create Developers Page",
        "status": "New",
        "url": "https://www.binayah.com/real-estate-developers-dubai/ays-developers/"
      },
      {
        "project_name": "Ryze by AUM",
        "created_by": "nida",
        "project_date": "2026-03-26",
        "project_detail": "Info Update & Draft it",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/ryze-by-aum/"
      },
      {
        "project_name": "",
        "created_by": "zahaib",
        "project_date": "",
        "project_detail": "",
        "status": "",
        "url": ""
      },
      {
        "project_name": "Cetara at DAMAC Lagoons",
        "created_by": "nida",
        "project_date": "2026-03-27",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/cetara-at-damac-lagoons/"
      },
      {
        "project_name": "Sorrento at DAMAC Lagoons",
        "created_by": "nida",
        "project_date": "2026-03-27",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/sorrento-at-damac-lagoons/"
      },
      {
        "project_name": "Elanora Residences by Zoya",
        "created_by": "nida",
        "project_date": "2026-03-27",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/elanora-residences-by-zoya/"
      },
      {
        "project_name": "The Harmony by Al Mizan",
        "created_by": "nida",
        "project_date": "2026-03-27",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/the-harmony-by-al-mizan/"
      },
      {
        "project_name": "Layan at Masaar 3 Phase 5",
        "created_by": "nida",
        "project_date": "2026-03-28",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/sharjah-projects/layan-at-masaar-3-phase-5/"
      },
      {
        "project_name": "The Winslow",
        "created_by": "nida",
        "project_date": "2026-03-30",
        "project_detail": "Info Update",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/the-winslow-at-meydan-horizon/"
      },
      {
        "project_name": "Fleur De Jardin Villas at MBR City",
        "created_by": "nida",
        "project_date": "2026-03-30",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/fleur-de-jardin-villas-at-mbr-city/"
      },
      {
        "project_name": "SAMANA Business Hub",
        "created_by": "nida",
        "project_date": "2026-03-30",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/samana-business-hub/"
      },
      {
        "project_name": "CASA Alita at Al Furjan",
        "created_by": "nida",
        "project_date": "2026-03-31",
        "project_detail": "Project Data Entry for creating reference video",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/casa-altia-at-al-furjan/"
      },
      {
        "project_name": "AMIS Properties",
        "created_by": "nida",
        "project_date": "2026-03-31",
        "project_detail": "Create Developer Page",
        "status": "New",
        "url": "https://www.binayah.com/real-estate-developers-dubai/amis-properties/"
      },
      {
        "project_name": "WOW Tower",
        "created_by": "nida",
        "project_date": "2026-03-31",
        "project_detail": "Video Page",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/wow-tower-dubailand/video/"
      },
      {
        "project_name": "Valia Tower by Emaar",
        "created_by": "nida",
        "project_date": "2026-03-31",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/valia-tower-by-emaar/"
      },
      {
        "project_name": "NEJM 1",
        "created_by": "nida",
        "project_date": "2026-03-31",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/nejm-1-residences-at-mbr-city/"
      },
      {
        "project_name": "Arada CBD Cluster 2",
        "created_by": "nida",
        "project_date": "2026-04-01",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/sharjah-projects/arada-cbd-cluster-2/"
      },
      {
        "project_name": "Vivida Residences",
        "created_by": "nida",
        "project_date": "2026-04-01",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/vivida-residences-at-dubai-south/"
      },
      {
        "project_name": "RR Grand at Dubai South",
        "created_by": "nida",
        "project_date": "2026-04-01",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/rr-grand-at-dubai-south/"
      },
      {
        "project_name": "Cetara at Damac Lagoon",
        "created_by": "nida",
        "project_date": "2026-04-01",
        "project_detail": "Content adding + create inner page",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/cetara-at-damac-lagoons/"
      },
      {
        "project_name": "RR Grand at Dubai South",
        "created_by": "nida",
        "project_date": "2026-04-01",
        "project_detail": "Content adding for main page",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/rr-grand-at-dubai-south/"
      },
      {
        "project_name": "Elanora Residences by Zoya",
        "created_by": "nida",
        "project_date": "2026-04-01",
        "project_detail": "Content adding + create inner page",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/elanora-residences-by-zoya/"
      },
      {
        "project_name": "Elanora Residences by Zoya",
        "created_by": "nida",
        "project_date": "2026-04-01",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/elanora-residences-by-zoya/"
      },
      {
        "project_name": "Sorrento at Damac Lagoons",
        "created_by": "nida",
        "project_date": "2026-04-01",
        "project_detail": "Floor Plans + Inner Pages",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/sorrento-at-damac-lagoons/"
      },
      {
        "project_name": "Azizi Creek Views 4",
        "created_by": "nida",
        "project_date": "2026-04-02",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/azizi-creek-views-4/"
      },
      {
        "project_name": "Serra Residences in Liwan",
        "created_by": "nida",
        "project_date": "2026-04-02",
        "project_detail": "Draft + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/serra-residences-in-liwan/"
      },
      {
        "project_name": "Prestige Gardens",
        "created_by": "nida",
        "project_date": "2026-04-02",
        "project_detail": "Draft + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/prestige-gardens/"
      },
      {
        "project_name": "Treppan Living",
        "created_by": "nida",
        "project_date": "2026-04-02",
        "project_detail": "Info Upate",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/treppan-living-prive/"
      },
      {
        "project_name": "Chapter 02 by Newbury",
        "created_by": "nida",
        "project_date": "2026-04-02",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/chapter-02-by-newbury/"
      },
      {
        "project_name": "https://www.binayah.com/wp-admin/post.php?post=405814&action=edit",
        "created_by": "nida",
        "project_date": "2026-04-02",
        "project_detail": "Draft",
        "status": "New",
        "url": "https://www.binayah.com/from-500k-to-5m-the-complete-dubai-property-investment-roadmap-for-international-buyers/"
      },
      {
        "project_name": "Faro The Heights by Emaar",
        "created_by": "nida",
        "project_date": "2026-04-03",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/faro-the-heights-by-emaar/"
      },
      {
        "project_name": "Faro 2 The Heights by Emaar",
        "created_by": "nida",
        "project_date": "2026-04-03",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/faro-2-the-heights-by-emaar/"
      },
      {
        "project_name": "Southlofts at Dubai South",
        "created_by": "nida",
        "project_date": "2026-04-03",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/southlofts-at-dubai-south/"
      },
      {
        "project_name": "Valia Tower by Emaar",
        "created_by": "nida",
        "project_date": "2026-04-03",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/valia-tower-by-emaar/"
      },
      {
        "project_name": "Arada CBD 2",
        "created_by": "nida",
        "project_date": "2026-04-03",
        "project_detail": "Content adding + create inner page",
        "status": "Old",
        "url": "https://www.binayah.com/sharjah-projects/arada-cbd-cluster-2/"
      },
      {
        "project_name": "Azizi Creek Views 4",
        "created_by": "nida",
        "project_date": "2026-04-03",
        "project_detail": "Content adding + create inner page",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/azizi-creek-views-4/"
      },
      {
        "project_name": "Azizi Creek Views 4",
        "created_by": "nida",
        "project_date": "2026-04-03",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/azizi-creek-views-4/"
      },
      {
        "project_name": "Nejm 1",
        "created_by": "nida",
        "project_date": "2026-04-03",
        "project_detail": "Content adding + create inner page",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/nejm-1-residences-at-mbr-city/"
      },
      {
        "project_name": "Nejm 1",
        "created_by": "nida",
        "project_date": "2026-04-03",
        "project_detail": "Floor Plan",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/nejm-1-residences/"
      },
      {
        "project_name": "Burj Capital Phase 3",
        "created_by": "nida",
        "project_date": "2026-04-04",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/burj-capital-phase-3/"
      },
      {
        "project_name": "Ice Beach by Major",
        "created_by": "nida",
        "project_date": "2026-04-04",
        "project_detail": "Draft + New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/ras-al-khaimah-projects/ice-beach-by-major-at-al-marjan/"
      },
      {
        "project_name": "Faro 2 The Heights",
        "created_by": "nida",
        "project_date": "2026-04-04",
        "project_detail": "Content adding + create inner page",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/faro-2-the-heights-by-emaar/"
      },
      {
        "project_name": "Faro 2 The Heights",
        "created_by": "nida",
        "project_date": "2026-04-04",
        "project_detail": "Floor Plan",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/faro-2-the-heights/"
      },
      {
        "project_name": "Faro The Heights",
        "created_by": "nida",
        "project_date": "2026-04-04",
        "project_detail": "Content adding + create inner page",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/faro-the-heights-by-emaar/"
      },
      {
        "project_name": "faro The Heights",
        "created_by": "nida",
        "project_date": "2026-04-04",
        "project_detail": "Floor Plan",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/faro-the-heights/"
      },
      {
        "project_name": "Serenia at The Heights",
        "created_by": "nida",
        "project_date": "2026-04-04",
        "project_detail": "Content adding + create inner page",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/serenia-at-the-heights/"
      },
      {
        "project_name": "Serenia at The Heights",
        "created_by": "nida",
        "project_date": "2026-04-04",
        "project_detail": "Floor Plan",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/serenia-at-the-heights/"
      },
      {
        "project_name": "Valia Tower by Emaar",
        "created_by": "nida",
        "project_date": "2026-04-04",
        "project_detail": "Content adding + create inner page",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/valia-tower-by-emaar/"
      },
      {
        "project_name": "Valia Tower by Emaar",
        "created_by": "nida",
        "project_date": "2026-04-04",
        "project_detail": "Floor Plan",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/valia-tower-by-emaar/"
      },
      {
        "project_name": "Orvessa by Mechael Adams",
        "created_by": "nida",
        "project_date": "2026-04-04",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/orvessa-by-michael-adams/"
      },
      {
        "project_name": "The Promise Villas",
        "created_by": "nida",
        "project_date": "2026-04-06",
        "project_detail": "Draft + New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/the-promise-villas-by-hnb-vision/"
      },
      {
        "project_name": "Sunvale at Al Furjan",
        "created_by": "nida",
        "project_date": "2026-04-06",
        "project_detail": "Draft + Info update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/sunvale-at-al-furjan/"
      },
      {
        "project_name": "https://www.binayah.com/wp-admin/post.php?post=404388&action=edit",
        "created_by": "nida",
        "project_date": "2026-04-06",
        "project_detail": "Draft + Info update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/courtyard-one-at-dubai-south/"
      },
      {
        "project_name": "MAAK Residence at Dubai South",
        "created_by": "nida",
        "project_date": "2026-04-06",
        "project_detail": "Draft + Info update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/maak-residence-at-dubai-south/"
      },
      {
        "project_name": "X11 Residence at Dubai South",
        "created_by": "nida",
        "project_date": "2026-04-06",
        "project_detail": "Draft + New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/x11-residence-at-dubai-south/"
      },
      {
        "project_name": "Sunvale at Al Furjan",
        "created_by": "nida",
        "project_date": "2026-04-06",
        "project_detail": "Content adding",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/sunvale-at-al-furjan/"
      },
      {
        "project_name": "The Promise Villas By HNB Vision",
        "created_by": "nida",
        "project_date": "2026-04-06",
        "project_detail": "Content adding",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/the-promise-villas-by-hnb-vision/"
      },
      {
        "project_name": "Castleton Central Park",
        "created_by": "nida",
        "project_date": "2026-04-06",
        "project_detail": "Content adding + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/castleton-cenrtal-park-at-city-walk/"
      },
      {
        "project_name": "Layan at Massar 3 Phase 5",
        "created_by": "nida",
        "project_date": "2026-04-07",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/sharjah-projects/layan-at-masaar-3-phase-5/"
      },
      {
        "project_name": "The Row Phase 2",
        "created_by": "nida",
        "project_date": "2026-04-07",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/abu-dhabi-projects/the-row-phase-2-saadiyat/"
      },
      {
        "project_name": "Legacy Heights at Dubai South",
        "created_by": "nida",
        "project_date": "2026-04-07",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/legacy-heights-at-dubai-south/"
      },
      {
        "project_name": "Richmond District at Al Furjan",
        "created_by": "nida",
        "project_date": "2026-04-07",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/richmond-district-at-al-furjan/"
      },
      {
        "project_name": "X11 Residences",
        "created_by": "nida",
        "project_date": "2026-04-07",
        "project_detail": "Content Added",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/x11-residence-at-dubai-south/"
      },
      {
        "project_name": "MAAK Residence at Dubai South",
        "created_by": "nida",
        "project_date": "2026-04-07",
        "project_detail": "Content Added",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/maak-residence-at-dubai-south/"
      },
      {
        "project_name": "Courtyard One at Dubai South",
        "created_by": "nida",
        "project_date": "2026-04-07",
        "project_detail": "Content Added",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/courtyard-one-at-dubai-south/"
      },
      {
        "project_name": "Gardens 2 by IMAN Developers at Arjan Dubai",
        "created_by": "nida",
        "project_date": "2026-04-08",
        "project_detail": "Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/gardens-2-iman/"
      },
      {
        "project_name": "Al Vista at Meydan",
        "created_by": "nida",
        "project_date": "2026-04-08",
        "project_detail": "Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/al-vista-at-meydan/"
      },
      {
        "project_name": "Radiant Bridges at Al Reem Island",
        "created_by": "nida",
        "project_date": "2026-04-08",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/abu-dhabi-projects/radiant-bridges-al-reem-island/"
      },
      {
        "project_name": "Richmond District",
        "created_by": "nida",
        "project_date": "2026-04-08",
        "project_detail": "Video Page",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/richmond-district-at-al-furjan/video/"
      },
      {
        "project_name": "Richmond District",
        "created_by": "nida",
        "project_date": "2026-04-08",
        "project_detail": "Content Adding + Inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/richmond-district-al-furjan/"
      },
      {
        "project_name": "Lunaya Residences at Jebel Ali",
        "created_by": "nida",
        "project_date": "2026-04-09",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/lunaya-residences-at-jebel-ali/"
      },
      {
        "project_name": "Bab Al Qasr Sea View Residence 51",
        "created_by": "nida",
        "project_date": "2026-04-09",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/abu-dhabi-projects/bab-al-qasr-sea-view-residence-51/"
      },
      {
        "project_name": "The Harmony by Al Mizan",
        "created_by": "nida",
        "project_date": "2026-04-09",
        "project_detail": "Content adding + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/the-harmony-by-al-mizan/"
      },
      {
        "project_name": "Vivida Residences at Dubai South",
        "created_by": "nida",
        "project_date": "2026-04-09",
        "project_detail": "Content adding + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/vivida-residences-at-dubai-south/"
      },
      {
        "project_name": "O1NE District",
        "created_by": "nida",
        "project_date": "2026-04-09",
        "project_detail": "Content adding + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/o1ne-district-dawn-at-motor-city/"
      },
      {
        "project_name": "Stories by Mirfa",
        "created_by": "nida",
        "project_date": "2026-04-09",
        "project_detail": "Content adding + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/stories-by-mirfa/"
      },
      {
        "project_name": "The Harmony by Al Mezan",
        "created_by": "nida",
        "project_date": "2026-04-09",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/the-harmony-by-al-mizan/"
      },
      {
        "project_name": "Vivida Residences at Dubai South",
        "created_by": "nida",
        "project_date": "2026-04-09",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/vivida-residences/"
      },
      {
        "project_name": "O1NE District",
        "created_by": "nida",
        "project_date": "2026-04-09",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/o1ne-district-dawn/"
      },
      {
        "project_name": "Stories by Mirfa",
        "created_by": "nida",
        "project_date": "2026-04-09",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/stories-by-mirfa/"
      },
      {
        "project_name": "J188 at Al Jaddaf",
        "created_by": "nida",
        "project_date": "2026-04-10",
        "project_detail": "Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/j188-at-al-jaddaf/"
      },
      {
        "project_name": "Signature Mansions Villas",
        "created_by": "nida",
        "project_date": "2026-04-10",
        "project_detail": "Update Info + Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/signature-mansions-villas/"
      },
      {
        "project_name": "ORVESSA by Michael Adams",
        "created_by": "nida",
        "project_date": "2026-04-10",
        "project_detail": "Video Page",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/orvessa-by-michael-adams/video/"
      },
      {
        "project_name": "Timber Terrace",
        "created_by": "nida",
        "project_date": "2026-04-10",
        "project_detail": "Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/timber-terrace/"
      },
      {
        "project_name": "Glorious Residence at Al Warsan",
        "created_by": "nida",
        "project_date": "2026-04-10",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/glorious-central-residences/"
      },
      {
        "project_name": "Nineteen Riviera Lagoon at D11",
        "created_by": "nida",
        "project_date": "2026-04-10",
        "project_detail": "Video Page",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/nineteen-riviera-lagoon-at-d11/video/"
      },
      {
        "project_name": "ORVESSA by Michael Adams",
        "created_by": "nida",
        "project_date": "2026-04-10",
        "project_detail": "Content adding + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/orvessa-by-michael-adams/"
      },
      {
        "project_name": "ORVESSA by Michael Adams",
        "created_by": "nida",
        "project_date": "2026-04-10",
        "project_detail": "Floor Plan",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/orvessa-by-michael-adams/"
      },
      {
        "project_name": "The Hub Residences",
        "created_by": "nida",
        "project_date": "2026-04-11",
        "project_detail": "Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/the-hub-residences-at-al-furjan/"
      },
      {
        "project_name": "Yas Park Place",
        "created_by": "nida",
        "project_date": "2026-04-11",
        "project_detail": "Info update",
        "status": "Old",
        "url": "https://www.binayah.com/abu-dhabi-projects/yas-park-place-by-aldar/"
      },
      {
        "project_name": "Hayat 1 at Dubai South",
        "created_by": "nida",
        "project_date": "2026-04-11",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/hayat-1-at-dubai-south/"
      },
      {
        "project_name": "77S Tower in Downtown Dubai",
        "created_by": "nida",
        "project_date": "2026-04-11",
        "project_detail": "Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/77s-tower-at-business-bay/"
      },
      {
        "project_name": "Faro Heights by Emaar",
        "created_by": "nida",
        "project_date": "2026-04-11",
        "project_detail": "Info Updates",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/faro-the-heights-by-emaar/"
      },
      {
        "project_name": "Fleur De Jardin Villas at MBR City",
        "created_by": "nida",
        "project_date": "2026-04-11",
        "project_detail": "Content adding + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/fleur-de-jardin-villas-at-mbr-city/"
      },
      {
        "project_name": "Fleur De Jardin Villas at MBR City",
        "created_by": "nida",
        "project_date": "2026-04-11",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/fleur-de-jardin-villas/"
      },
      {
        "project_name": "Lunaya Residences by Zaya",
        "created_by": "nida",
        "project_date": "2026-04-11",
        "project_detail": "Content adding + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/lunaya-residences-at-jebel-ali/"
      },
      {
        "project_name": "Lunaya Residences by Zaya",
        "created_by": "nida",
        "project_date": "2026-04-11",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/lunaya-residences-by-zaya/"
      },
      {
        "project_name": "Radient Bridges",
        "created_by": "nida",
        "project_date": "2026-04-11",
        "project_detail": "Content adding + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/abu-dhabi-projects/radiant-bridges-al-reem-island/"
      },
      {
        "project_name": "Bab al Qasar Sea View 51",
        "created_by": "nida",
        "project_date": "2026-04-11",
        "project_detail": "Content adding + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/abu-dhabi-projects/bab-al-qasr-sea-view-residence-51/"
      },
      {
        "project_name": "The Row Phase 2 at Saadiyat Island",
        "created_by": "nida",
        "project_date": "2026-04-11",
        "project_detail": "Content adding + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/abu-dhabi-projects/the-row-phase-2-saadiyat/"
      },
      {
        "project_name": "The Orchard Sobha City",
        "created_by": "nida",
        "project_date": "2026-04-13",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/abu-dhabi-projects/the-orchard-sobha-city/"
      },
      {
        "project_name": "The Terraces Sobha City",
        "created_by": "nida",
        "project_date": "2026-04-13",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/abu-dhabi-projects/the-terraces-sobha-city/"
      },
      {
        "project_name": "River Cove Residences Sobha City",
        "created_by": "nida",
        "project_date": "2026-04-13",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/abu-dhabi-projects/river-cove-residences-sobha-city/"
      },
      {
        "project_name": "Sobha City Apartments",
        "created_by": "nida",
        "project_date": "2026-04-13",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/abu-dhabi-projects/sobha-city-apartments/"
      },
      {
        "project_name": "Empire Gardens at DLRC",
        "created_by": "nida",
        "project_date": "2026-04-13",
        "project_detail": "Content adding + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/empire-gardens-at-dlrc/"
      },
      {
        "project_name": "Empire Gardens at DLRC",
        "created_by": "nida",
        "project_date": "2026-04-13",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/dubailand/empire-gardens/"
      },
      {
        "project_name": "Sobha City Apartments",
        "created_by": "nida",
        "project_date": "2026-04-14",
        "project_detail": "Video Page",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/sobha-city-apartments/video/"
      },
      {
        "project_name": "Parkgreen Residences",
        "created_by": "nida",
        "project_date": "2026-04-14",
        "project_detail": "Info Updates",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/parkgreen-residences/"
      },
      {
        "project_name": "Parkgreen Residences",
        "created_by": "nida",
        "project_date": "2026-04-14",
        "project_detail": "Video Page",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/parkgreen-residences/video/"
      },
      {
        "project_name": "Southlofts at dubai south",
        "created_by": "zahaib",
        "project_date": "2026-04-14",
        "project_detail": "Content added + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/southlofts-at-dubai-south/"
      },
      {
        "project_name": "Serra Residences Liwan",
        "created_by": "nida",
        "project_date": "2026-04-14",
        "project_detail": "Content added + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/serra-residences-in-liwan/"
      },
      {
        "project_name": "Serra Residences Liwan",
        "created_by": "nida",
        "project_date": "2026-04-14",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/serra-residences/"
      },
      {
        "project_name": "Sobha City Apartments",
        "created_by": "nida",
        "project_date": "2026-04-14",
        "project_detail": "Content added + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/abu-dhabi-projects/sobha-city-apartments/"
      },
      {
        "project_name": "Layan at Massar 3 phase 5",
        "created_by": "nida",
        "project_date": "2026-04-14",
        "project_detail": "Content added + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/sharjah-projects/layan-at-masaar-3-phase-5/"
      },
      {
        "project_name": "SAMANA Business Hub",
        "created_by": "nida",
        "project_date": "2026-04-14",
        "project_detail": "Content added + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/samana-business-hub/"
      },
      {
        "project_name": "SAMANA Business Hub",
        "created_by": "nida",
        "project_date": "2026-04-14",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/samana-business-hub/"
      },
      {
        "project_name": "The Harmony by Al Mizan",
        "created_by": "nida",
        "project_date": "2026-04-14",
        "project_detail": "Content added + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/the-harmony-by-al-mizan/"
      },
      {
        "project_name": "The Harmony by Al Mizan",
        "created_by": "nida",
        "project_date": "2026-04-14",
        "project_detail": "Floor Plans",
        "status": "Old",
        "url": "https://www.binayah.com/dubai/floor-plans/the-harmony-by-al-mizan/"
      },
      {
        "project_name": "Chapter 02 by Newbury",
        "created_by": "zahaib",
        "project_date": "2026-04-14",
        "project_detail": "Content Added + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/chapter-02-by-newbury/"
      },
      {
        "project_name": "Chapter 02 by Newbury",
        "created_by": "zahaib",
        "project_date": "2026-04-14",
        "project_detail": "Floor Plan",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/chapter-02-by-newbury/"
      },
      {
        "project_name": "Prestige Gardens at Jumeirah Garden City",
        "created_by": "nida",
        "project_date": "2026-04-15",
        "project_detail": "Content added + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/prestige-gardens/"
      },
      {
        "project_name": "Prestige Gardens at Jumeirah Garden City",
        "created_by": "nida",
        "project_date": "2026-04-15",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/prestige-gardens/"
      },
      {
        "project_name": "The Orchard Sobha City",
        "created_by": "nida",
        "project_date": "2026-04-15",
        "project_detail": "Content added + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/abu-dhabi-projects/the-orchard-sobha-city/"
      },
      {
        "project_name": "The Terraces Sobha City",
        "created_by": "nida",
        "project_date": "2026-04-15",
        "project_detail": "Content added + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/abu-dhabi-projects/the-terraces-sobha-city/"
      },
      {
        "project_name": "Jana at Aljada",
        "created_by": "nida",
        "project_date": "2026-04-15",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/sharjah-projects/jana-at-aljada/"
      },
      {
        "project_name": "River Cove Residences at Sobha City",
        "created_by": "nida",
        "project_date": "2026-04-16",
        "project_detail": "Content added + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/abu-dhabi-projects/river-cove-residences-sobha-city/"
      },
      {
        "project_name": "The Terraces at Sobha City",
        "created_by": "nida",
        "project_date": "2026-04-16",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/abu-dhabi-projects/the-terraces-sobha-city/"
      },
      {
        "project_name": "The Orchard at Sobha City",
        "created_by": "nida",
        "project_date": "2026-04-16",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/abu-dhabi-projects/the-orchard-sobha-city/"
      },
      {
        "project_name": "River Cove at Sobha City",
        "created_by": "nida",
        "project_date": "2026-04-16",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/abu-dhabi-projects/river-cove-residences-sobha-city/"
      },
      {
        "project_name": "Valia Tower by Emaar",
        "created_by": "nida",
        "project_date": "2026-04-16",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/valia-tower-by-emaar/"
      },
      {
        "project_name": "Trevino at JVC",
        "created_by": "nida",
        "project_date": "2026-04-16",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/trevino-by-avelon/"
      },
      {
        "project_name": "Damac Riverside Views Capri 1",
        "created_by": "nida",
        "project_date": "2026-04-17",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/capri-1-by-damac/"
      },
      {
        "project_name": "Damac Riverside Views Capri 2",
        "created_by": "nida",
        "project_date": "2026-04-17",
        "project_detail": "New Project + Content Missing",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/damac-riverside-views-capri-2/"
      },
      {
        "project_name": "Damac Riverside Views Azure 1",
        "created_by": "nida",
        "project_date": "2026-04-17",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/damac-riverside-views-azure-1/"
      },
      {
        "project_name": "VIO Residence Al Warsan 4",
        "created_by": "nida",
        "project_date": "2026-04-17",
        "project_detail": "Draft + Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/vio-residences/"
      },
      {
        "project_name": "Almaara Residences at Al Furjan",
        "created_by": "nida",
        "project_date": "2026-04-17",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/almaara-residences-at-al-furjan/"
      },
      {
        "project_name": "Regal Crest Dubai South",
        "created_by": "nida",
        "project_date": "2026-04-17",
        "project_detail": "Draft + Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/regal-crest-at-dubai-south/"
      },
      {
        "project_name": "Longford Residences by Devan Development",
        "created_by": "nida",
        "project_date": "2026-04-17",
        "project_detail": "Draft + Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/longford-residences/"
      },
      {
        "project_name": "Modelux Tower 1",
        "created_by": "nida",
        "project_date": "2026-04-17",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/modelux-tower-1-international-city/"
      },
      {
        "project_name": "Glorious Central Residences",
        "created_by": "nida",
        "project_date": "2026-04-17",
        "project_detail": "Content added + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/glorious-central-residences/"
      },
      {
        "project_name": "Glorious Central Residences",
        "created_by": "nida",
        "project_date": "2026-04-17",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/glorious-central-residences/"
      },
      {
        "project_name": "Hayat 1 Dubai South",
        "created_by": "nida",
        "project_date": "2026-04-17",
        "project_detail": "Content added + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/hayat-1-at-dubai-south/"
      },
      {
        "project_name": "Hayat 1 Dubai South",
        "created_by": "nida",
        "project_date": "2026-04-17",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/hayat-1/"
      },
      {
        "project_name": "La MEr by Elie Saab",
        "created_by": "nida",
        "project_date": "2026-04-18",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/ras-al-khaimah-projects/la-mer-by-elie-saab/"
      },
      {
        "project_name": "The Terraces at Sobha City",
        "created_by": "nida",
        "project_date": "2026-04-18",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/abu-dhabi-projects/the-terraces-sobha-city/"
      },
      {
        "project_name": "Khalid Bin Sultan City",
        "created_by": "nida",
        "project_date": "2026-04-18",
        "project_detail": "Info Update + Draft",
        "status": "Old",
        "url": "https://www.binayah.com/sharjah-projects/khalid-bin-sultan-city/"
      },
      {
        "project_name": "Sobha City Apartments",
        "created_by": "nida",
        "project_date": "2026-04-18",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/abu-dhabi-projects/sobha-city-apartments/"
      },
      {
        "project_name": "Arlington Park 2 DLRC",
        "created_by": "nida",
        "project_date": "2026-04-20",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/arlington-park-2-at-dlrc/"
      },
      {
        "project_name": "The Borough at JVC",
        "created_by": "nida",
        "project_date": "2026-04-20",
        "project_detail": "Info Update + Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/the-borough-at-jvc/"
      },
      {
        "project_name": "Tilal Binghatti at Al Rowaiyah",
        "created_by": "nida",
        "project_date": "2026-04-20",
        "project_detail": "Info Update + Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/tilal-by-binghatti/"
      },
      {
        "project_name": "Anantara Mina Residences",
        "created_by": "nida",
        "project_date": "2026-04-20",
        "project_detail": "Info update",
        "status": "Old",
        "url": "https://www.binayah.com/ras-al-khaimah-projects/anantara-mina-residences/"
      },
      {
        "project_name": "Valia by Emaar",
        "created_by": "nida",
        "project_date": "2026-04-21",
        "project_detail": "Content added + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/valia-tower-by-emaar/"
      },
      {
        "project_name": "Valia by Emaar",
        "created_by": "nida",
        "project_date": "2026-04-21",
        "project_detail": "Floor Plans",
        "status": "Old",
        "url": "https://www.binayah.com/dubai/floor-plans/valia-tower-by-emaar/"
      },
      {
        "project_name": "Cheval Residences Dubai Islands",
        "created_by": "nida",
        "project_date": "2026-04-21",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/cheval-residences-dubai-islands/"
      },
      {
        "project_name": "Cheval Residences Dubai Islands",
        "created_by": "nida",
        "project_date": "2026-04-21",
        "project_detail": "Content added + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/cheval-residences-dubai-islands/"
      },
      {
        "project_name": "Cheval Residences Dubai Islands",
        "created_by": "nida",
        "project_date": "2026-04-21",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/cheval-residences/"
      },
      {
        "project_name": "Cheval Residences Dubai Islands",
        "created_by": "nida",
        "project_date": "2026-04-21",
        "project_detail": "Video Page",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/cheval-residences-dubai-islands/video/"
      },
      {
        "project_name": "Tara Park by Modon",
        "created_by": "nida",
        "project_date": "2026-04-21",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/abu-dhabi-projects/tara-park-by-modon/"
      },
      {
        "project_name": "Sky Harmony at JVC",
        "created_by": "nida",
        "project_date": "2026-04-21",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/sky-harmony-at-jvc/"
      },
      {
        "project_name": "Burj Crown at downtown dubai",
        "created_by": "zahaib",
        "project_date": "2026-04-21",
        "project_detail": "Added content & faqs + Inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/burj-crown-by-emaar/"
      },
      {
        "project_name": "Burj Crown Floor plans",
        "created_by": "zahaib",
        "project_date": "2026-04-21",
        "project_detail": "Floor Plan",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/burj-crown-by-emaar/"
      },
      {
        "project_name": "Legacy Heights",
        "created_by": "zahaib",
        "project_date": "2026-04-21",
        "project_detail": "Content & faqs added + inner pages",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/legacy-heights-at-dubai-south/"
      },
      {
        "project_name": "Legacy Heights",
        "created_by": "zahaib",
        "project_date": "2026-04-21",
        "project_detail": "Floor plan",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/legacy-heights/"
      },
      {
        "project_name": "Summer at Creek Beach",
        "created_by": "zahaib",
        "project_date": "2026-04-21",
        "project_detail": "Content & faqs added + inner pages added + style updated",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/summer-at-creek-beach/"
      },
      {
        "project_name": "Summer at creek beach",
        "created_by": "zahaib",
        "project_date": "2026-04-21",
        "project_detail": "Floor plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/summer-by-emaar/"
      },
      {
        "project_name": "Laguna Residence",
        "created_by": "nida",
        "project_date": "2026-04-22",
        "project_detail": "Info Update  + Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/laguna-residence-at-city-of-arabia/"
      },
      {
        "project_name": "Crystal Tower",
        "created_by": "nida",
        "project_date": "2026-04-22",
        "project_detail": "Info Update + Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/crystal-tower-by-vhs/"
      },
      {
        "project_name": "Kyomi Residences",
        "created_by": "nida",
        "project_date": "2026-04-22",
        "project_detail": "Info Update + Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/kyomi-residence/"
      },
      {
        "project_name": "Trussardi Residences 2",
        "created_by": "nida",
        "project_date": "2026-04-22",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/trussardi-residences-2/"
      },
      {
        "project_name": "Mackerel Tower",
        "created_by": "nida",
        "project_date": "2026-04-22",
        "project_detail": "Info Update + Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/mackerel-tower-dubai-islands/"
      },
      {
        "project_name": "Arthouse Hills at Arjan",
        "created_by": "nida",
        "project_date": "2026-04-22",
        "project_detail": "Info Update + Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/arthouse-hills-at-arjan/"
      },
      {
        "project_name": "The Community Sports Arena",
        "created_by": "nida",
        "project_date": "2026-04-22",
        "project_detail": "info Update + Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/the-community-sports-arena/"
      },
      {
        "project_name": "Burj Capital Phase 3",
        "created_by": "nida",
        "project_date": "2026-04-22",
        "project_detail": "Content & faqs added + inner pages added",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/burj-capital-phase-3/"
      },
      {
        "project_name": "Burj Capital Phase 3",
        "created_by": "nida",
        "project_date": "2026-04-22",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/burj-capital-phase-3/"
      },
      {
        "project_name": "Jana at Aljada",
        "created_by": "nida",
        "project_date": "2026-04-22",
        "project_detail": "Content & faqs added + inner pages added",
        "status": "Old",
        "url": "https://www.binayah.com/sharjah-projects/jana-at-aljada/"
      },
      {
        "project_name": "171 Garden Heights",
        "created_by": "nida",
        "project_date": "2026-04-23",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/171-garden-heights-jumeirah-garden-city/"
      },
      {
        "project_name": "Liora Residences at Dubai Islands",
        "created_by": "nida",
        "project_date": "2026-04-23",
        "project_detail": "Info Update + Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/liora-residences-at-dubai-islands/"
      },
      {
        "project_name": "Havelock Heights",
        "created_by": "nida",
        "project_date": "2026-04-23",
        "project_detail": "Info Update + Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/havelock-heights-jvc/"
      },
      {
        "project_name": "Antigua at Damac Islands",
        "created_by": "nida",
        "project_date": "2026-04-23",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/antigua-at-damac-islands/"
      },
      {
        "project_name": "Kaia Residences",
        "created_by": "nida",
        "project_date": "2026-04-23",
        "project_detail": "Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/kaia-residences/"
      },
      {
        "project_name": "Lia Residences at Dubai Islands",
        "created_by": "nida",
        "project_date": "2026-04-23",
        "project_detail": "Info update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/lia-residences-at-dubai-islands/"
      },
      {
        "project_name": "Tori at Al Furjan",
        "created_by": "nida",
        "project_date": "2026-04-23",
        "project_detail": "Info Update + Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/tori-at-al-furjan/"
      },
      {
        "project_name": "Tura Residence",
        "created_by": "zahaib",
        "project_date": "2026-04-23",
        "project_detail": "Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/tura-residence-at-meydan/"
      },
      {
        "project_name": "The Borough at JVC",
        "created_by": "nida",
        "project_date": "2026-04-23",
        "project_detail": "Content & faqs added + inner pages added",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/the-borough-at-jvc/"
      },
      {
        "project_name": "The Borough at JVC",
        "created_by": "nida",
        "project_date": "2026-04-23",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/jumeirah-village-circle/the-borough/"
      },
      {
        "project_name": "Tara Park at Reem Island",
        "created_by": "nida",
        "project_date": "2026-04-23",
        "project_detail": "Content & faqs added + inner pages added",
        "status": "Old",
        "url": "https://www.binayah.com/abu-dhabi-projects/tara-park-at-reem-island/"
      },
      {
        "project_name": "Arlington Park 2",
        "created_by": "nida",
        "project_date": "2026-04-23",
        "project_detail": "Content & faqs added + inner pages added",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/arlington-park-2-at-dlrc/"
      },
      {
        "project_name": "Arlington Park 2",
        "created_by": "nida",
        "project_date": "2026-04-23",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/arlington-park-2/"
      },
      {
        "project_name": "Al Vista at Meydan",
        "created_by": "nida",
        "project_date": "2026-04-23",
        "project_detail": "Content Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/al-vista-at-meydan/"
      },
      {
        "project_name": "Tilal Binghatti",
        "created_by": "nida",
        "project_date": "2026-04-23",
        "project_detail": "Content Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/tilal-by-binghatti/"
      },
      {
        "project_name": "Greencrest by Emaar",
        "created_by": "nida",
        "project_date": "2026-04-24",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/greencrest-by-emaar/"
      },
      {
        "project_name": "Jenna 1 at Aljada by Arada",
        "created_by": "nida",
        "project_date": "2026-04-24",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/sharjah-projects/jenna-1-at-aljada/"
      },
      {
        "project_name": "Binghatti Sky Terraces Video",
        "created_by": "nida",
        "project_date": "2026-04-25",
        "project_detail": "Video Page",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/binghatti-sky-terraces-at-motor-city/video/"
      },
      {
        "project_name": "Binghatti Sky Terraces",
        "created_by": "nida",
        "project_date": "2026-04-25",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/binghatti-sky-terraces/"
      },
      {
        "project_name": "Ananda Residences at Dubai Motor City",
        "created_by": "nida",
        "project_date": "2026-04-25",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/ananda-residence/"
      },
      {
        "project_name": "Ramada Residences at Dubai Islnads",
        "created_by": "nida",
        "project_date": "2026-04-25",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/ramada-residences-dubai-islands/"
      },
      {
        "project_name": "Hawa Residences at Tilal City",
        "created_by": "nida",
        "project_date": "2026-04-25",
        "project_detail": "Draft",
        "status": "Old",
        "url": "https://www.binayah.com/sharjah-projects/hawa-residence-at-tilal-city/"
      },
      {
        "project_name": "Tomorrow Commercial Tower",
        "created_by": "nida",
        "project_date": "2026-04-25",
        "project_detail": "Info Update + Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/tomorrow-commercial-tower/"
      },
      {
        "project_name": "VOI Residences",
        "created_by": "nida",
        "project_date": "2026-04-25",
        "project_detail": "Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/voi-residence-at-dubai-south/"
      },
      {
        "project_name": "Greygate Residences at JVC",
        "created_by": "nida",
        "project_date": "2026-04-25",
        "project_detail": "Info Update + Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/greygate-residences-at-jvc/"
      },
      {
        "project_name": "Q Gardens Aliya",
        "created_by": "nida",
        "project_date": "2026-04-25",
        "project_detail": "Info Update + Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/q-gardens-aliya/"
      },
      {
        "project_name": "Signature Lifestyle Residences",
        "created_by": "nida",
        "project_date": "2026-04-25",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/signature-lifestyle-residences/"
      },
      {
        "project_name": "FAUCHON RESIDENCES By Prestige One",
        "created_by": "nida",
        "project_date": "2026-04-27",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/fauchon-residences-by-prestige-one/"
      },
      {
        "project_name": "Ananda Residence at Dubai Motor City",
        "created_by": "nida",
        "project_date": "2026-04-27",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/ananda-residence/"
      },
      {
        "project_name": "Bellavion at Wasl Gate",
        "created_by": "nida",
        "project_date": "2026-04-27",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/bellavion-at-wasl-gate/"
      },
      {
        "project_name": "FAUCHON RESIDENCES By Prestige One",
        "created_by": "nida",
        "project_date": "2026-04-27",
        "project_detail": "Content & faqs added + inner pages added",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/fauchon-residences-by-prestige-one/"
      },
      {
        "project_name": "FAUCHON RESIDENCES By Prestige One",
        "created_by": "nida",
        "project_date": "2026-04-27",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/fauchon-residences/"
      },
      {
        "project_name": "Hawa Residences at Tilal Sharjah",
        "created_by": "nida",
        "project_date": "2026-04-27",
        "project_detail": "Content added + inner pages added",
        "status": "Old",
        "url": "https://www.binayah.com/sharjah-projects/hawa-residence-at-tilal-city/"
      },
      {
        "project_name": "Ananda Residence at Dubai Motor City",
        "created_by": "nida",
        "project_date": "2026-04-27",
        "project_detail": "Content added + inner pages added",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/ananda-residence/"
      },
      {
        "project_name": "Ananda Residence at Dubai Motor City",
        "created_by": "nida",
        "project_date": "2026-04-27",
        "project_detail": "Floor Plans",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/motor-city/ananda-residence-by-tiger-properties/"
      },
      {
        "project_name": "Signature Lifestyle Residences at JLT",
        "created_by": "zahaib",
        "project_date": "2026-04-28",
        "project_detail": "Content & faqs added",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/signature-lifestyle-residences/"
      },
      {
        "project_name": "ENTA Mina at Hayat Island",
        "created_by": "nida",
        "project_date": "2026-04-28",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/ras-al-khaimah-projects/enta-mina/"
      },
      {
        "project_name": "Joud Residence by ONE",
        "created_by": "nida",
        "project_date": "2026-04-28",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/abu-dhabi-projects/joud-residence-al-reem-island/"
      },
      {
        "project_name": "Signature lifestyle Residences",
        "created_by": "zahaib",
        "project_date": "2026-04-28",
        "project_detail": "Floor plan",
        "status": "New",
        "url": "https://www.binayah.com/dubai/floor-plans/signature-lifestyle-residences/"
      },
      {
        "project_name": "Alva by Emaar",
        "created_by": "nida",
        "project_date": "2026-04-28",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/alva-by-emaar/"
      },
      {
        "project_name": "Fior By Emaar",
        "created_by": "nida",
        "project_date": "2026-04-28",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/fior-by-emaar/"
      },
      {
        "project_name": "Boulevard Park at Wasl Gate",
        "created_by": "nida",
        "project_date": "2026-04-28",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/boulevard-park/"
      },
      {
        "project_name": "1970 Office Tower",
        "created_by": "nida",
        "project_date": "2026-04-29",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/1970-office-tower-by-al-habtoor-group/"
      },
      {
        "project_name": "Sobha Skyparks",
        "created_by": "nida",
        "project_date": "2026-04-29",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/sobha-skyparks/"
      },
      {
        "project_name": "Riviera by MERED",
        "created_by": "nida",
        "project_date": "2026-04-29",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/abu-dhabi-projects/riviera-by-mered/"
      },
      {
        "project_name": "Longfor International Center",
        "created_by": "nida",
        "project_date": "2026-04-29",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/longfor-international-center/"
      },
      {
        "project_name": "Divine Elements at Dubai South",
        "created_by": "nida",
        "project_date": "2026-04-29",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/divine-elements/"
      },
      {
        "project_name": "Dubai Harbour Residences",
        "created_by": "zahaib",
        "project_date": "2026-04-29",
        "project_detail": "Video Page",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/dubai-harbour-residences/video/"
      },
      {
        "project_name": "Dubai Harbour Residences",
        "created_by": "zahaib",
        "project_date": "2026-04-29",
        "project_detail": "Info Updated + developer link added",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/dubai-harbour-residences-by-shamal/"
      },
      {
        "project_name": "Greenfield Living",
        "created_by": "nida",
        "project_date": "2026-04-30",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/greenfield-living/"
      },
      {
        "project_name": "Arthouse Hills in Arjan",
        "created_by": "nida",
        "project_date": "2026-04-30",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/arthouse-hills-arjan/"
      },
      {
        "project_name": "Sakura Gardens",
        "created_by": "nida",
        "project_date": "2026-04-30",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/sakura-gardens/"
      },
      {
        "project_name": "RR Grand at Dubai South",
        "created_by": "nida",
        "project_date": "2026-04-30",
        "project_detail": "Info Updtae + Draft",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/rr-grand-at-dubai-south/"
      },
      {
        "project_name": "Work on Images Missing ALT",
        "created_by": "nida",
        "project_date": "2026-04-30",
        "project_detail": "Images Missing ALTs",
        "status": "New",
        "url": "https://www.binayah.com/off-plan-properties-dubai/"
      },
      {
        "project_name": "Onda by Kasco",
        "created_by": "nida",
        "project_date": "2026-05-01",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/onda-by-kasco/"
      },
      {
        "project_name": "District 11 by Al Marwan",
        "created_by": "nida",
        "project_date": "2026-05-01",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/sharjah-projects/district-11-by-al-marwan/"
      },
      {
        "project_name": "District 11 by Al Marwan",
        "created_by": "nida",
        "project_date": "2026-05-01",
        "project_detail": "Video Page",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/district-11-by-al-marwan/video/"
      },
      {
        "project_name": "The Community Sports Areana",
        "created_by": "nida",
        "project_date": "2026-05-01",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/the-community-sports-arena/"
      },
      {
        "project_name": "The Central Downtown",
        "created_by": "nida",
        "project_date": "2026-05-01",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/the-central-downtown/"
      },
      {
        "project_name": "Elanora by Zoya",
        "created_by": "nida",
        "project_date": "2026-05-02",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/elanora-residences-by-zoya/"
      },
      {
        "project_name": "Reywan Hoshi",
        "created_by": "nida",
        "project_date": "2026-05-02",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/sharjah-projects/reywan-hoshi/"
      },
      {
        "project_name": "Reywan Al Badee",
        "created_by": "nida",
        "project_date": "2026-05-02",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/sharjah-projects/reywan-al-badee/"
      },
      {
        "project_name": "Clover Residences Dubailand",
        "created_by": "nida",
        "project_date": "2026-05-02",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/clover-residences-dubailand/"
      },
      {
        "project_name": "Violet Phase 3 by Damac",
        "created_by": "nida",
        "project_date": "2026-05-04",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/violet-phase-3-by-damac-2/"
      },
      {
        "project_name": "Alva 3 by Emaar",
        "created_by": "nida",
        "project_date": "2026-05-04",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/alva-3-by-emaar/"
      },
      {
        "project_name": "Enso Jade by Enso Development",
        "created_by": "nida",
        "project_date": "2026-05-04",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/enso-jade-at-jumeirah-garden-city/"
      },
      {
        "project_name": "Symbolic Aura at Al Furjan",
        "created_by": "nida",
        "project_date": "2026-05-04",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/symbolic-aura-at-al-furjan/"
      },
      {
        "project_name": "Oxford Cove at JVC",
        "created_by": "nida",
        "project_date": "2026-05-04",
        "project_detail": "Info Update",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/oxford-cove-at-jvc/"
      },
      {
        "project_name": "Trevino at JVC",
        "created_by": "nida",
        "project_date": "2026-05-04",
        "project_detail": "Info update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/trevino-by-avelon/"
      },
      {
        "project_name": "Meriva Shores by Ellington",
        "created_by": "nida",
        "project_date": "2026-05-05",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/meriva-shores-by-ellington/"
      },
      {
        "project_name": "Enchante at Arjan",
        "created_by": "nida",
        "project_date": "2026-05-05",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/enchante-at-arjan/"
      },
      {
        "project_name": "Elevia Residences 3",
        "created_by": "nida",
        "project_date": "2026-05-05",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/elevia-residences-3/"
      },
      {
        "project_name": "Tahiti 2 at Damac Islands Phase 2",
        "created_by": "nida",
        "project_date": "2026-05-06",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3615.0333641742204!2d55.303914775669284!3d25.032941777817094!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f71007d2c7ddb%3A0x1b027af8495fd7d!2sDamac%20islands%20Phase%202!5e0!3m2!1sen!2s!4v1778052576743!5m2!1sen!2s"
      },
      {
        "project_name": "Barbados 2 at Damac Islands Phase 2",
        "created_by": "nida",
        "project_date": "2026-05-06",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/barbados-2-at-damac-islands-phase-2/"
      },
      {
        "project_name": "Emirates Palace Mansions",
        "created_by": "nida",
        "project_date": "2026-05-06",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/abu-dhabi-projects/emirates-palace-mansions/"
      },
      {
        "project_name": "Bahamas Phase 2",
        "created_by": "nida",
        "project_date": "2026-05-06",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/bahamas-2-damac-islands-phase-2/"
      },
      {
        "project_name": "Azizi Neila",
        "created_by": "nida",
        "project_date": "2026-05-06",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/azizi-neila/"
      },
      {
        "project_name": "Binghatti Luxuria JVT",
        "created_by": "nida",
        "project_date": "2026-05-06",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/binghatti-luxuria-jvt/"
      },
      {
        "project_name": "Sol Terra Casa at JVC",
        "created_by": "nida",
        "project_date": "2026-05-07",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/sol-terra-casa-at-jvc/"
      },
      {
        "project_name": "Terrazzo Residences at JVC",
        "created_by": "nida",
        "project_date": "2026-05-07",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/terrazzo-residences-at-jvc/"
      },
      {
        "project_name": "Noble Crest at JVC",
        "created_by": "nida",
        "project_date": "2026-05-07",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/noble-crest-at-jvc/"
      },
      {
        "project_name": "Wyndham Residence at Al Marjan",
        "created_by": "nida",
        "project_date": "2026-05-07",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/ras-al-khaimah-projects/wyndham-residence-at-al-marjan/"
      },
      {
        "project_name": "Colibri Views by Major",
        "created_by": "nida",
        "project_date": "2026-05-07",
        "project_detail": "Info Update",
        "status": "Old",
        "url": "https://www.binayah.com/ras-al-khaimah-projects/colibri-views-by-major/"
      },
      {
        "project_name": "Vienna House Residence by Wyndham",
        "created_by": "nida",
        "project_date": "2026-05-08",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/ras-al-khaimah-projects/vienna-house-residence-by-wyndham/"
      },
      {
        "project_name": "11 Hills Park at Dubai Science Park",
        "created_by": "nida",
        "project_date": "2026-05-08",
        "project_detail": "Info Updates",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/11-park-hills/"
      },
      {
        "project_name": "AG Central",
        "created_by": "nida",
        "project_date": "2026-05-08",
        "project_detail": "Info Updates",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/ag-central/"
      },
      {
        "project_name": "Dusit Thani Residences By Aqaar",
        "created_by": "nida",
        "project_date": "2026-05-09",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/ajman-projects/dusit-thani-residences-by-aqaar/"
      },
      {
        "project_name": "Enchante at Arjan",
        "created_by": "nida",
        "project_date": "2026-05-09",
        "project_detail": "Info Updates",
        "status": "Old",
        "url": "https://www.binayah.com/dubai-projects/enchante-at-arjan/"
      },
      {
        "project_name": "Bonds Avenue Residences",
        "created_by": "nida",
        "project_date": "2026-05-09",
        "project_detail": "New Project + Content Missing + Draft",
        "status": "New",
        "url": "https://www.binayah.com/dubai-projects/bonds-avenue-residences-at-dubai-islands/"
      },
      {
        "project_name": "",
        "created_by": "nida",
        "project_date": "",
        "project_detail": "",
        "status": "",
        "url": ""
      }
    ],
    "idBase": 1702276101935
  },
  {
    "name": "Backlinks Update",
    "icon": "🔗",
    "columns": [
      {
        "id": "backlink",
        "name": "Backlink",
        "type": "url",
        "width": 320
      },
      {
        "id": "property",
        "name": "Property",
        "type": "url",
        "width": 280
      },
      {
        "id": "anchor_text",
        "name": "Anchor Text",
        "type": "text",
        "width": 220
      },
      {
        "id": "date_added",
        "name": "Date Added",
        "type": "date",
        "width": 140
      },
      {
        "id": "domain_authority",
        "name": "Domain Authority",
        "type": "number",
        "width": 130
      },
      {
        "id": "status",
        "name": "Status",
        "type": "status",
        "width": 120,
        "options": [
          "Active",
          "Pending"
        ]
      }
    ],
    "dedupe": [
      "backlink",
      "property",
      "date_added"
    ],
    "rows": [
      {
        "backlink": "https://medium.com/@binayah.seo/greenz-by-danube-f7299699e299",
        "property": "https://www.binayah.com/dubai-projects/greenz-by-danube/",
        "anchor_text": "",
        "date_added": "2026-03-24",
        "domain_authority": "95",
        "status": "Active"
      },
      {
        "backlink": "https://share.evernote.com/note/abb99339-f37c-7b2a-6f63-5bff3e313dab",
        "property": "https://www.binayah.com/dubai-projects/greenz-by-danube/",
        "anchor_text": "",
        "date_added": "2026-03-24",
        "domain_authority": "92",
        "status": "Active"
      },
      {
        "backlink": "https://binayahpropertiesdubai.wordpress.com/2026/03/24/greenz-by-danube/",
        "property": "https://www.binayah.com/dubai-projects/greenz-by-danube/",
        "anchor_text": "",
        "date_added": "2026-03-24",
        "domain_authority": "95",
        "status": "Active"
      },
      {
        "backlink": "https://www.tumblr.com/binayahprop/811958390219816960/greenz-by-danube-dubais-real-estate-market?source=share",
        "property": "https://www.binayah.com/dubai-projects/greenz-by-danube/",
        "anchor_text": "",
        "date_added": "2026-03-24",
        "domain_authority": "86",
        "status": "Active"
      },
      {
        "backlink": "https://binayahpropertiesdubai1.blogspot.com/2026/03/greenz-by-danube.html",
        "property": "https://www.binayah.com/dubai-projects/greenz-by-danube/",
        "anchor_text": "",
        "date_added": "2026-03-24",
        "domain_authority": "100",
        "status": "Active"
      },
      {
        "backlink": "https://www.deviantart.com/binayahpropertiesdub/art/1313339593?action=published",
        "property": "https://www.binayah.com/dubai-projects/greenz-by-danube/",
        "anchor_text": "",
        "date_added": "2026-03-24",
        "domain_authority": "90",
        "status": "Active"
      },
      {
        "backlink": "https://www.instapaper.com/read/1994328810",
        "property": "https://www.binayah.com/dubai-projects/greenz-by-danube/",
        "anchor_text": "",
        "date_added": "2026-03-24",
        "domain_authority": "89",
        "status": "Active"
      },
      {
        "backlink": "https://diigo.com/0126s6m",
        "property": "https://www.binayah.com/dubai-projects/greenz-by-danube/",
        "anchor_text": "",
        "date_added": "2026-03-24",
        "domain_authority": "91",
        "status": "Active"
      },
      {
        "backlink": "https://www.pinterest.com/pin/975873813024549424",
        "property": "https://www.binayah.com/dubai-projects/greenz-by-danube/",
        "anchor_text": "",
        "date_added": "2026-03-24",
        "domain_authority": "94",
        "status": "Active"
      },
      {
        "backlink": "https://www.reddit.com/user/cryptoforrealty/comments/1s29uh2/dubai_villas_starting_at_aed_35m_with_a_private/",
        "property": "https://www.binayah.com/dubai-projects/greenz-by-danube/",
        "anchor_text": "",
        "date_added": "2026-03-25",
        "domain_authority": "92",
        "status": "Active"
      },
      {
        "backlink": "https://medium.com/@binayah.seo/the-island-at-azizi-venice-in-dubai-south-2668c81e0545",
        "property": "https://www.binayah.com/dubai-projects/the-island-at-azizi-venice/",
        "anchor_text": "",
        "date_added": "2026-03-25",
        "domain_authority": "95",
        "status": "Active"
      },
      {
        "backlink": "https://binayahpropertiesdubai1.blogspot.com/2026/03/the-island-at-azizi-venice-in-dubai.html",
        "property": "https://www.binayah.com/dubai-projects/the-island-at-azizi-venice/",
        "anchor_text": "",
        "date_added": "2026-03-25",
        "domain_authority": "100",
        "status": "Active"
      },
      {
        "backlink": "https://sites.google.com/view/theislandatazizivenice/home",
        "property": "https://www.binayah.com/dubai-projects/the-island-at-azizi-venice/",
        "anchor_text": "",
        "date_added": "2026-03-25",
        "domain_authority": "96",
        "status": "Active"
      },
      {
        "backlink": "https://padlet.com/binayahseo/dubai-properties-for-sale-z5b75yeg9hma6j4d/wish/YBl3Z2OEBm8MWv16",
        "property": "https://www.binayah.com/dubai-projects/the-island-at-azizi-venice/",
        "anchor_text": "",
        "date_added": "2026-03-25",
        "domain_authority": "89",
        "status": "Active"
      },
      {
        "backlink": "https://sco.lt/7pb7eS",
        "property": "https://www.binayah.com/dubai-projects/the-island-at-azizi-venice/",
        "anchor_text": "",
        "date_added": "2026-03-25",
        "domain_authority": "92",
        "status": "Active"
      },
      {
        "backlink": "https://justpaste.it/ldi0z",
        "property": "https://www.binayah.com/dubai-projects/the-island-at-azizi-venice/",
        "anchor_text": "",
        "date_added": "2026-03-25",
        "domain_authority": "100",
        "status": "Active"
      },
      {
        "backlink": "https://photos.google.com/share/AF1QipPiJJXxcsnZSBM2Mb2nKzeQMT4S5gWSs_19gPyfd7IsRnNmWeWFd1WGhRgnlv3org?key=aTNveFFIYjh1dkFzSWltZFpvSEFpdHF0LWZrdlhB",
        "property": "https://www.binayah.com/dubai-projects/the-island-at-azizi-venice/",
        "anchor_text": "",
        "date_added": "2026-03-25",
        "domain_authority": "94",
        "status": "Active"
      },
      {
        "backlink": "https://www.expatriates.com/cls/62872746.html",
        "property": "https://www.binayah.com/dubai-projects/the-island-at-azizi-venice/",
        "anchor_text": "",
        "date_added": "2026-03-25",
        "domain_authority": "55",
        "status": "Active"
      },
      {
        "backlink": "https://dubai.craigslist.org/rts/d/the-island-at-azizi-venice/7923397348.html",
        "property": "https://www.binayah.com/dubai-projects/the-island-at-azizi-venice/",
        "anchor_text": "",
        "date_added": "2026-03-25",
        "domain_authority": "88",
        "status": "Active"
      },
      {
        "backlink": "https://www.dewalist.com/properties/flats-apartments/the-island-at-azizi-venice-dubai-652482.html",
        "property": "https://www.binayah.com/dubai-projects/the-island-at-azizi-venice/",
        "anchor_text": "",
        "date_added": "2026-03-25",
        "domain_authority": "57",
        "status": "Active"
      },
      {
        "backlink": "https://medium.com/@binayah.seo/casa-altia-at-al-furjan-c10c9e292b00",
        "property": "https://www.binayah.com/dubai-projects/casa-altia-at-al-furjan/",
        "anchor_text": "",
        "date_added": "2026-03-26",
        "domain_authority": "95",
        "status": "Active"
      },
      {
        "backlink": "https://binayahpropertiesdubai1.blogspot.com/2026/03/casa-altia-at-al-furjan.html",
        "property": "https://www.binayah.com/dubai-projects/casa-altia-at-al-furjan/",
        "anchor_text": "",
        "date_added": "2026-03-26",
        "domain_authority": "100",
        "status": "Active"
      },
      {
        "backlink": "https://binayahpropertiesdubai.wordpress.com/2026/03/26/casa-altia-at-al-furjan/",
        "property": "https://www.binayah.com/dubai-projects/casa-altia-at-al-furjan/",
        "anchor_text": "",
        "date_added": "2026-03-26",
        "domain_authority": "95",
        "status": "Active"
      },
      {
        "backlink": "https://ext-6944343.livejournal.com/332.html?newpost=1",
        "property": "https://www.binayah.com/dubai-projects/casa-altia-at-al-furjan/",
        "anchor_text": "",
        "date_added": "2026-03-26",
        "domain_authority": "93",
        "status": "Active"
      },
      {
        "backlink": "https://anotepad.com/notes/xgcqcxhk",
        "property": "https://www.binayah.com/dubai-projects/casa-altia-at-al-furjan/",
        "anchor_text": "",
        "date_added": "2026-03-26",
        "domain_authority": "85",
        "status": "Active"
      },
      {
        "backlink": "https://justpaste.it/kqgiw",
        "property": "https://www.binayah.com/dubai-projects/casa-altia-at-al-furjan/",
        "anchor_text": "",
        "date_added": "2026-03-26",
        "domain_authority": "91",
        "status": "Active"
      },
      {
        "backlink": "https://flipboard.com/@binayahprop7rfb/casa-altia-at-al-furjan-luxury-living-starts-at-aed-1-8m-02uooc7cy",
        "property": "https://www.binayah.com/dubai-projects/casa-altia-at-al-furjan/",
        "anchor_text": "",
        "date_added": "2026-03-26",
        "domain_authority": "85",
        "status": "Active"
      },
      {
        "backlink": "https://pingler.com/?ping_hash=49de51fa994669eb205b6254f4269873d61924a381d1a7cdba4cc7850dda23dd",
        "property": "https://www.binayah.com/dubai-projects/casa-altia-at-al-furjan/",
        "anchor_text": "",
        "date_added": "2026-03-26",
        "domain_authority": "75",
        "status": "Active"
      },
      {
        "backlink": "https://pingomatic.com/ping/?title=Casa+Altia+at+Al+Furjan&blogurl=https%3A%2F%2Fwww.binayah.com%2Fdubai-projects%2Fcasa-altia-at-al-furjan%2F&rssurl=http%3A%2F%2F&chk_blogs=on&chk_feedburner=on&chk_tailrank=on&chk_superfeedr=on",
        "property": "https://www.binayah.com/dubai-projects/casa-altia-at-al-furjan/",
        "anchor_text": "",
        "date_added": "2026-03-26",
        "domain_authority": "75",
        "status": "Active"
      },
      {
        "backlink": "https://www.pinterest.com/pin/975873813024622121",
        "property": "https://www.binayah.com/dubai-projects/casa-altia-at-al-furjan/",
        "anchor_text": "",
        "date_added": "2026-03-26",
        "domain_authority": "94",
        "status": "Active"
      },
      {
        "backlink": "Content Creation for Cetara at DAMAC Lagoons, Sorrento at DAMAC Lagoons and Elanora Residences by Zoya",
        "property": "",
        "anchor_text": "",
        "date_added": "2026-03-28",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://medium.com/@binayah.seo/cetara-at-damac-lagoons-0f01d2191acc",
        "property": "https://www.binayah.com/dubai-projects/cetara-at-damac-lagoons/",
        "anchor_text": "",
        "date_added": "2026-03-28",
        "domain_authority": "95",
        "status": "Active"
      },
      {
        "backlink": "https://binayahpropertiesdubai1.blogspot.com/2026/03/cetara-at-damac-lagoons.html",
        "property": "https://www.binayah.com/dubai-projects/cetara-at-damac-lagoons/",
        "anchor_text": "",
        "date_added": "2026-03-28",
        "domain_authority": "100",
        "status": "Active"
      },
      {
        "backlink": "https://binayahpropertiesdubai.wordpress.com/2026/03/28/cetara-at-damac-lagoons/",
        "property": "https://www.binayah.com/dubai-projects/cetara-at-damac-lagoons/",
        "anchor_text": "",
        "date_added": "2026-03-28",
        "domain_authority": "95",
        "status": "Active"
      },
      {
        "backlink": "https://www.flickr.com/photos/204466832@N08/55172113232/in/dateposted-public/",
        "property": "https://www.binayah.com/dubai-projects/cetara-at-damac-lagoons/",
        "anchor_text": "",
        "date_added": "2026-03-28",
        "domain_authority": "92",
        "status": "Active"
      },
      {
        "backlink": "https://www.behance.net/gallery/246594819/Cetara-at-DAMAC-Lagoons?share=1",
        "property": "https://www.binayah.com/dubai-projects/cetara-at-damac-lagoons/",
        "anchor_text": "",
        "date_added": "2026-03-28",
        "domain_authority": "93",
        "status": "Active"
      },
      {
        "backlink": "https://ext-6944343.livejournal.com/636.html?newpost=1",
        "property": "https://www.binayah.com/dubai-projects/cetara-at-damac-lagoons/",
        "anchor_text": "",
        "date_added": "2026-03-28",
        "domain_authority": "93",
        "status": "Active"
      },
      {
        "backlink": "https://www.pinterest.com/pin/975873813024694429",
        "property": "https://www.binayah.com/dubai-projects/sorrento-at-damac-lagoons/",
        "anchor_text": "",
        "date_added": "2026-03-28",
        "domain_authority": "94",
        "status": "Active"
      },
      {
        "backlink": "https://photos.google.com/album/AF1QipOzwzY5kRWh2OB56if1rk6VK4sGpB7KIAGZfKKt",
        "property": "https://www.binayah.com/dubai-projects/sorrento-at-damac-lagoons/",
        "anchor_text": "",
        "date_added": "2026-03-28",
        "domain_authority": "94",
        "status": "Active"
      },
      {
        "backlink": "https://tr.ee/Lc72EgQhST",
        "property": "https://www.binayah.com/dubai-projects/sorrento-at-damac-lagoons/",
        "anchor_text": "",
        "date_added": "2026-03-28",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://www.pinterest.com/pin/975873813025084189",
        "property": "https://www.binayah.com/dubai-projects/castleton-cenrtal-park-at-city-walk/",
        "anchor_text": "",
        "date_added": "2026-04-08",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://binayahpropertiesdubai1.blogspot.com/2026/04/castleton-central-park-at-city-walk.html",
        "property": "https://www.binayah.com/dubai-projects/castleton-cenrtal-park-at-city-walk/",
        "anchor_text": "",
        "date_added": "2026-04-08",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://medium.com/@binayah.seo/castleton-central-park-at-city-walk-dubai-ad63d2463d59",
        "property": "https://www.binayah.com/dubai-projects/castleton-cenrtal-park-at-city-walk/",
        "anchor_text": "",
        "date_added": "2026-04-08",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://www.instapaper.com/read/2000486008",
        "property": "https://www.binayah.com/dubai-projects/castleton-cenrtal-park-at-city-walk/",
        "anchor_text": "",
        "date_added": "2026-04-08",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://dubai.craigslist.org/rts/d/arada-cbd-cluster-at-aljada/7926807545.html",
        "property": "https://www.binayah.com/sharjah-projects/arada-cbd-cluster-2/",
        "anchor_text": "",
        "date_added": "2026-04-10",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://www.expatriates.com/cls/62998465.html",
        "property": "https://www.binayah.com/sharjah-projects/arada-cbd-cluster-2/",
        "anchor_text": "",
        "date_added": "2026-04-10",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://www.dewalist.com/properties/commercial/arada-cbd-cluster-2-at-aljada-dubai-658777.html",
        "property": "https://www.binayah.com/sharjah-projects/arada-cbd-cluster-2/",
        "anchor_text": "",
        "date_added": "2026-04-10",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://www.locanto.ae/dubai/ID_8500908563/Own-Premium-Office-Space-in-Aljada-Arada-CBD-Cluster-2.html",
        "property": "https://www.binayah.com/sharjah-projects/arada-cbd-cluster-2/",
        "anchor_text": "",
        "date_added": "2026-04-10",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://medium.com/@binayah.seo/arada-cbd-cluster-2-at-aljada-a032caa78984",
        "property": "https://www.binayah.com/sharjah-projects/arada-cbd-cluster-2/",
        "anchor_text": "",
        "date_added": "2026-04-10",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://www.instapaper.com/read/2004337315",
        "property": "https://www.binayah.com/dubai-projects/summer-at-creek-beach/",
        "anchor_text": "",
        "date_added": "2026-04-20",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://diigo.com/012ea2u",
        "property": "https://www.binayah.com/dubai-projects/summer-at-creek-beach/",
        "anchor_text": "",
        "date_added": "2026-04-20",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://medium.com/@binayah.seo/orvessa-by-michael-adams-fcc3e6c10b08",
        "property": "https://www.binayah.com/dubai-projects/orvessa-by-michael-adams/",
        "anchor_text": "",
        "date_added": "2026-04-20",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://binayahpropertiesdubai1.blogspot.com/2026/04/orvessa-by-michael-adams.html",
        "property": "https://www.binayah.com/dubai-projects/orvessa-by-michael-adams/",
        "anchor_text": "",
        "date_added": "2026-04-20",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://www.pinterest.com/pin/975873813025508754",
        "property": "https://www.binayah.com/dubai-projects/summer-at-creek-beach/",
        "anchor_text": "",
        "date_added": "2026-04-20",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://www.expatriates.com/cls/63077460.html",
        "property": "https://www.binayah.com/dubai-projects/summer-at-creek-beach/",
        "anchor_text": "",
        "date_added": "2026-04-20",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://www.dewalist.com/properties/flats-apartments/summer-at-creek-beach-dubai-662826.html",
        "property": "https://www.binayah.com/dubai-projects/summer-at-creek-beach/",
        "anchor_text": "",
        "date_added": "2026-04-20",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://medium.com/@binayah.seo/cheval-residences-at-dubai-islands-19d433bf4d88",
        "property": "https://www.binayah.com/dubai-projects/cheval-residences-dubai-islands/",
        "anchor_text": "",
        "date_added": "2026-04-22",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.pinterest.com/pin/975873813025567268/",
        "property": "https://www.binayah.com/dubai-projects/cheval-residences-dubai-islands/",
        "anchor_text": "",
        "date_added": "2026-04-22",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://binayahpropertiesdubai1.blogspot.com/2026/04/cheval-residences-at-dubai-islands-by.html",
        "property": "https://www.binayah.com/dubai-projects/cheval-residences-dubai-islands/",
        "anchor_text": "",
        "date_added": "2026-04-22",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.tumblr.com/binayahprop/814592641913192448/cheval-residences-at-dubai-islands-a-branded?source=share",
        "property": "https://www.binayah.com/dubai-projects/cheval-residences-dubai-islands/",
        "anchor_text": "",
        "date_added": "2026-04-22",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.instapaper.com/read/2005576789",
        "property": "https://www.binayah.com/dubai-projects/cheval-residences-dubai-islands/",
        "anchor_text": "",
        "date_added": "2026-04-22",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.expatriates.com/cls/63108260.html?preview",
        "property": "https://www.binayah.com/dubai-projects/cheval-residences-dubai-islands/",
        "anchor_text": "",
        "date_added": "2026-04-24",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://viesearch.com/26fym/submission-success",
        "property": "https://www.binayah.com/dubai-projects/cheval-residences-dubai-islands/",
        "anchor_text": "",
        "date_added": "2026-04-24",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.flickr.com/photos/204466832@N08/55226095897/in/dateposted-public/",
        "property": "https://www.binayah.com/dubai-projects/cheval-residences-dubai-islands/",
        "anchor_text": "",
        "date_added": "2026-04-24",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://www.reddit.com/user/cryptoforrealty/comments/1su83tt/is_this_one_of_the_most_interesting_waterfront/",
        "property": "https://www.binayah.com/dubai-projects/cheval-residences-dubai-islands/",
        "anchor_text": "",
        "date_added": "2026-04-24",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://sites.google.com/view/cheval-residences-at-dubai-isl/home",
        "property": "https://www.binayah.com/dubai-projects/cheval-residences-dubai-islands/",
        "anchor_text": "",
        "date_added": "2026-04-24",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://adpostman.com/?post_type=rtcl_listing&p=542933",
        "property": "https://www.binayah.com/dubai-projects/cheval-residences-dubai-islands/",
        "anchor_text": "",
        "date_added": "2026-04-24",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://adjeem.com/dubai/properties/property-for-sale/cheval-residences-at-dubai-islands-dubai-uae",
        "property": "https://www.binayah.com/dubai-projects/cheval-residences-dubai-islands/",
        "anchor_text": "",
        "date_added": "2026-04-24",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://totaldubai.com/listings/ad/apartments/cheval-residences-at-dubai-islands",
        "property": "https://www.binayah.com/dubai-projects/cheval-residences-dubai-islands/",
        "anchor_text": "",
        "date_added": "2026-04-24",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://medium.com/@binayah.seo/dubai-2-year-property-visa-2026-new-rules-benefits-how-to-apply-2ee81b26b432",
        "property": "https://www.binayah.com/dubai-updates-two-year-property-investor-visa-rules-creating-the-smartest-route-to-uae-residency-through-real-estate/",
        "anchor_text": "",
        "date_added": "2026-04-29",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://binayahpropertiesdubai1.blogspot.com/2026/04/dubai-2-year-property-visa-2026-new.html",
        "property": "https://www.binayah.com/dubai-updates-two-year-property-investor-visa-rules-creating-the-smartest-route-to-uae-residency-through-real-estate/",
        "anchor_text": "",
        "date_added": "2026-04-29",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://tr.ee/1DPf2PvUAk",
        "property": "https://www.binayah.com/dubai-updates-two-year-property-investor-visa-rules-creating-the-smartest-route-to-uae-residency-through-real-estate/",
        "anchor_text": "",
        "date_added": "2026-04-29",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.instapaper.com/read/2007113618",
        "property": "https://www.binayah.com/dubai-updates-two-year-property-investor-visa-rules-creating-the-smartest-route-to-uae-residency-through-real-estate/",
        "anchor_text": "",
        "date_added": "2026-04-29",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.a1bookmarks.com/preview-story/",
        "property": "https://www.binayah.com/dubai-updates-two-year-property-investor-visa-rules-creating-the-smartest-route-to-uae-residency-through-real-estate/",
        "anchor_text": "",
        "date_added": "2026-04-29",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.tumblr.com/binayahprop/815233144382996480/uae-property-visa-update?source=share",
        "property": "https://www.binayah.com/dubai-updates-two-year-property-investor-visa-rules-creating-the-smartest-route-to-uae-residency-through-real-estate/",
        "anchor_text": "",
        "date_added": "2026-04-29",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://www.behance.net/gallery/248465589/UAE-Property-Visa-Update",
        "property": "https://www.binayah.com/dubai-updates-two-year-property-investor-visa-rules-creating-the-smartest-route-to-uae-residency-through-real-estate/",
        "anchor_text": "",
        "date_added": "2026-04-29",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://medium.com/@binayah.seo/binghatti-sky-terraces-at-motor-city-dubai-price-payment-plan-floor-plans-investment-guide-7aa60721542c?postPublishedType=repub",
        "property": "https://www.binayah.com/dubai-projects/binghatti-sky-terraces/",
        "anchor_text": "",
        "date_added": "2026-05-01",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://binayahpropertiesdubai.wordpress.com/2026/05/01/binghatti-sky-terraces-at-motor-city-dubai-price-payment-plan-floor-plans-investment-guide-2026/",
        "property": "https://www.binayah.com/dubai-projects/binghatti-sky-terraces/",
        "anchor_text": "",
        "date_added": "2026-05-01",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.flickr.com/photos/203977037@N07/55241992398/in/dateposted-public/",
        "property": "https://www.binayah.com/dubai-projects/binghatti-sky-terraces/",
        "anchor_text": "",
        "date_added": "2026-05-01",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.behance.net/gallery/248579565/Binghatti-Sky-Terraces-at-Motor-City-Dubai",
        "property": "https://www.binayah.com/dubai-projects/binghatti-sky-terraces/",
        "anchor_text": "",
        "date_added": "2026-05-01",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://binayahpropertiesdubai1.blogspot.com/2026/05/binghatti-sky-terraces-at-motor-city.html",
        "property": "https://www.binayah.com/dubai-projects/binghatti-sky-terraces/",
        "anchor_text": "",
        "date_added": "2026-05-01",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://justpaste.it/m1tt5",
        "property": "https://www.binayah.com/dubai-projects/binghatti-sky-terraces/",
        "anchor_text": "",
        "date_added": "2026-05-01",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.reddit.com/user/cryptoforrealty/comments/1t0ptdp/is_ananda_residence_the_best_budget_offplan/",
        "property": "https://www.binayah.com/dubai-projects/ananda-residence/",
        "anchor_text": "",
        "date_added": "2026-04-30",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.pinterest.com/pin/975873813025867209",
        "property": "https://www.binayah.com/dubai-projects/ananda-residence/",
        "anchor_text": "",
        "date_added": "2026-04-30",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://medium.com/@binayah.seo/ananda-residence-at-dubai-motor-city-6f84d26beee0",
        "property": "https://www.binayah.com/dubai-projects/ananda-residence/",
        "anchor_text": "",
        "date_added": "2026-05-04",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://binayahpropertiesdubai1.blogspot.com/2026/05/ananda-residence-at-dubai-motor-city.html",
        "property": "https://www.binayah.com/dubai-projects/ananda-residence/",
        "anchor_text": "",
        "date_added": "2026-05-04",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://binayahpropertiesdubai.wordpress.com/2026/05/04/ananda-residence-at-dubai-motor-city/",
        "property": "https://www.binayah.com/dubai-projects/ananda-residence/",
        "anchor_text": "",
        "date_added": "2026-05-04",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.slideshare.net/slideshow/ananda-residence-at-dubai-motor-city-by-tiger-properties/287335814",
        "property": "https://www.binayah.com/dubai-projects/ananda-residence/",
        "anchor_text": "",
        "date_added": "2026-05-04",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.scribd.com/document/1034696839/Ananda-Residence-at-Dubai-Motor-City?_gl=1*1wgmm8t*_up*MQ..*_ga*MTIwNTE1OTEyNi4xNzc3ODk1NjM2*_ga_Z4ZC50DED6*czE3Nzc4OTU2MzUkbzEkZzAkdDE3Nzc4OTU2MzUkajYwJGwwJGgw*_ga_8KZ8BV0P5W*czE3Nzc4OTU2MzUkbzEkZzAkdDE3Nzc4OTU2MzUkajYwJGwwJGgw",
        "property": "https://www.binayah.com/dubai-projects/ananda-residence/",
        "anchor_text": "",
        "date_added": "2026-05-04",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.4shared.com/web/preview/pdf/7R4AS9yWjq?",
        "property": "https://www.binayah.com/dubai-projects/ananda-residence/",
        "anchor_text": "",
        "date_added": "2026-05-04",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://issuu.com/binayah/docs/ananda_residence_at_dubai_motor_city_?cta=post-publish-view-live",
        "property": "https://www.binayah.com/dubai-projects/ananda-residence/",
        "anchor_text": "",
        "date_added": "2026-05-04",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.reddit.com/user/cryptoforrealty/comments/1t3g6m8/is_elanora_residences_by_zoya_developments_the/",
        "property": "https://www.binayah.com/dubai-projects/elanora-residences-by-zoya/",
        "anchor_text": "",
        "date_added": "2026-05-04",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.pinterest.com/pin/975873813025978125",
        "property": "https://www.binayah.com/dubai-projects/elanora-residences-by-zoya/",
        "anchor_text": "",
        "date_added": "2026-05-04",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://tr.ee/9JnLeNGUGG",
        "property": "https://www.binayah.com/dubai-projects/sorrento-at-damac-lagoons/",
        "anchor_text": "",
        "date_added": "2026-05-06",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://medium.com/@binayah.seo/sorrento-at-damac-lagoons-731f1b76e095",
        "property": "https://www.binayah.com/dubai-projects/sorrento-at-damac-lagoons/",
        "anchor_text": "",
        "date_added": "2026-05-06",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://binayahpropertiesdubai1.blogspot.com/2026/05/sorrento-at-damac-lagoons.html",
        "property": "https://www.binayah.com/dubai-projects/sorrento-at-damac-lagoons/",
        "anchor_text": "",
        "date_added": "2026-05-06",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://www.pinterest.com/pin/975873813026037425/",
        "property": "https://www.binayah.com/dubai-projects/sorrento-at-damac-lagoons/",
        "anchor_text": "",
        "date_added": "2026-05-06",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://adjeem.com/dubai/properties/property-for-sale/cetara-at-damac-lagoons-dubai-uae",
        "property": "https://www.binayah.com/dubai-projects/cetara-at-damac-lagoons/",
        "anchor_text": "",
        "date_added": "2026-05-06",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://bazaroo.com/en/products/30856/cetara-at-damac-lagoons",
        "property": "https://www.binayah.com/dubai-projects/cetara-at-damac-lagoons/",
        "anchor_text": "",
        "date_added": "2026-05-06",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://www.expatriates.com/cls/63206705.html",
        "property": "https://www.binayah.com/dubai-projects/cetara-at-damac-lagoons/",
        "anchor_text": "",
        "date_added": "2026-05-06",
        "domain_authority": "",
        "status": "Active"
      },
      {
        "backlink": "https://adpostman.com/?post_type=rtcl_listing&p=545244",
        "property": "https://www.binayah.com/dubai-projects/cetara-at-damac-lagoons/",
        "anchor_text": "",
        "date_added": "2026-05-06",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://ext-6944343.livejournal.com/1022.html?newpost=1",
        "property": "https://www.binayah.com/dubai-projects/elanora-residences-by-zoya/",
        "anchor_text": "",
        "date_added": "",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.tumblr.com/binayahprop/815960449330855936/elanora-residences-by-zoya-offers-fully-furnished?source=share",
        "property": "https://www.binayah.com/dubai-projects/elanora-residences-by-zoya/",
        "anchor_text": "",
        "date_added": "",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://share.evernote.com/note/0ecfd2da-9d27-9d9c-8548-9472e79cf6e3",
        "property": "https://www.binayah.com/dubai-projects/elanora-residences-by-zoya/",
        "anchor_text": "",
        "date_added": "",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://medium.com/@binayah.seo/elanora-residences-by-zoya-in-dubai-industrial-city-35505f19edc8",
        "property": "https://www.binayah.com/dubai-projects/elanora-residences-by-zoya/",
        "anchor_text": "",
        "date_added": "",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://photos.app.goo.gl/hH5DYCNDfnXkB1Vm6",
        "property": "https://www.binayah.com/dubai-projects/elanora-residences-by-zoya/",
        "anchor_text": "",
        "date_added": "",
        "domain_authority": "",
        "status": "Pending"
      },
      {
        "backlink": "https://www.instapaper.com/read/2009481882",
        "property": "https://www.binayah.com/dubai-projects/elanora-residences-by-zoya/",
        "anchor_text": "",
        "date_added": "",
        "domain_authority": "",
        "status": "Pending"
      }
    ],
    "idBase": 1701552085431
  },
  {
    "name": "Deepshikha - Content Update",
    "icon": "📝",
    "columns": [
      {
        "id": "project_name",
        "name": "Project Name",
        "type": "text",
        "width": 360
      },
      {
        "id": "date",
        "name": "Date",
        "type": "date",
        "width": 140
      },
      {
        "id": "document",
        "name": "Document",
        "type": "url",
        "width": 320
      },
      {
        "id": "status",
        "name": "Status",
        "type": "status",
        "width": 120,
        "options": [
          "Draft",
          "Published",
          "Done",
          "Pending"
        ]
      }
    ],
    "dedupe": [
      "project_name",
      "date",
      "document"
    ],
    "rows": [
      {
        "project_name": "Content for https://www.google.com/search?sca_esv=a7c356437a2f7860&rlz=1C1RXQR_enIN1087IN1087&sxsrf=ANbL-n4mG_3F0g9p8QSfiy5bK5aG5VrfyA:1774864087673&q=the+winslow+at+meydan+horizon&spell=1&sa=X&ved=2ahUKEwiLouH7q8eTAxVz7jgGHQgCC4YQkeECKAB6BAgQEAEhttps://www.google.com/search?sca_esv=a7c356437a2f7860&rlz=1C1RXQR_enIN1087IN1087&sxsrf=ANbL-n4mG_3F0g9p8QSfiy5bK5aG5VrfyA:1774864087673&q=the+winslow+at+meydan+horizon&spell=1&sa=X&ved=2ahUKEwiLouH7q8eTAxVz7jgGHQgCC4YQkeECKAB6BAgQEAEhttps://www.google.com/search?sca_esv=a7c356437a2f7860&rlz=1C1RXQR_enIN1087IN1087&sxsrf=ANbL-n4mG_3F0g9p8QSfiy5bK5aG5VrfyA:1774864087673&q=the+winslow+at+meydan+horizon&spell=1&sa=X&ved=2ahUKEwiLouH7q8eTAxVz7jgGHQgCC4YQkeECKAB6BAgQEAE",
        "date": "2026-03-30",
        "document": "https://docs.google.com/document/d/1WKStgxcyqqxMCi9sIzWy42XYkUAkaN2DBpaNIW3yiPU/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for Fleur De Jardin Villas",
        "date": "2026-03-30",
        "document": "https://docs.google.com/document/d/1r4604UW77RC_rzKKYsTue5mxWuOR2DXVgQAXgNsMdeI/edit?usp=sharing",
        "status": "Draft"
      },
      {
        "project_name": "Cetara at DAMAC Lagoons",
        "date": "2026-04-01",
        "document": "https://docs.google.com/document/d/10ze6SDYbiKRAAZaeifOls1Myznmt1wISTEVENlsYj_k/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Elanora by Zoya",
        "date": "2026-04-01",
        "document": "https://docs.google.com/document/d/1x2ir5WVe55-_Mvgf_wuEtR_fxPHNru8rueHCD--oeqE/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Inner Page Content for Sorrento at Damac Lagoons",
        "date": "2026-04-01",
        "document": "https://docs.google.com/document/d/1bkFIj6sG0ruAI8NlHA3mCMobLRKj7UCUzCWITgjTLcc/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "RR Grand at Dubai South",
        "date": "2026-04-01",
        "document": "https://docs.google.com/document/d/14-KpHHYdDgdFWiz_D_PskgzZZ3QwWb38oz2wrPfhQPI/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Semrush Error for Binayah Properties",
        "date": "2026-04-02",
        "document": "Files are shared in Digital Marketing Group",
        "status": "Draft"
      },
      {
        "project_name": "Blog creation for Binayah Properties",
        "date": "2026-04-02",
        "document": "https://docs.google.com/document/d/1x94zvIHf3Vk61Jr-LV-MMf_WVd7D7Of7k2ZLLp8wWuc/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content Research for Azizi Creek Views 4",
        "date": "2026-04-02",
        "document": "https://www.binayah.com/dubai-projects/azizi-creek-views-4/",
        "status": "Draft"
      },
      {
        "project_name": "Content Research for Arada CBD Cluster 2",
        "date": "2026-04-02",
        "document": "https://www.binayah.com/sharjah-projects/arada-cbd-cluster-2/",
        "status": "Draft"
      },
      {
        "project_name": "Content Creation for Azizi Creek Views 4 at Al Jaddaf",
        "date": "2026-04-03",
        "document": "https://docs.google.com/document/d/1IWBTzIQh6W1zVhBlwv5Y54V4Z4LCtAgu27hb4Mv59rg/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content Creation for Arada CBD Cluster 2",
        "date": "2026-04-03",
        "document": "https://docs.google.com/document/d/1xBiEZpvi4LrxNVRsNjUo0beTduetvPhsvEdVF4Oyutg/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content Creation for Meta Title\nNejm 1 Residences at MBR City Dubai | 1 & 2 Bed Apartments | Q2 2027\nMeta Description\nNejm 1 Residences by DANF Group in Mohammed Bin Rashid City offers 1 & 2 bed apartments, 53 units, low-rise B+G+5+R, easy payment plan, retail spaces, prime location, handover Q2 2027.",
        "date": "2026-04-03",
        "document": "https://docs.google.com/document/d/13cU6qB82HPNaONrGs5nwleyqPYqyJZGMGaO1D3EtbfU/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Blog Content for Website",
        "date": "2026-04-03",
        "document": "https://docs.google.com/document/d/1Qdnrv9jmXTRLRDpA3-rvJYRzk_-EM6Q5uKUblC7p1O8/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for Valia Tower by Emaar at Dubai Creek Harbour",
        "date": "2026-04-04",
        "document": "https://docs.google.com/document/d/1Xs8rxXN1E7Gp7V3Uact8oQzoFfeebQlsAlOIf3Slo5c/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for Serenia at The Heights by Emaar",
        "date": "2026-04-04",
        "document": "https://docs.google.com/document/d/1KWenftkAnCpY6JWz--LBfEFQrYgJYGDRup6IbxdszaM/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for Faro at The Heights by Emaar",
        "date": "2026-04-04",
        "document": "https://docs.google.com/document/d/1tFmtzttK9TtrW59aXpmxwo9I65eysZ6WBeAUQ5msrsU/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for Faro 2 at The Heights by Emaar",
        "date": "2026-04-04",
        "document": "https://docs.google.com/document/d/1tFmtzttK9TtrW59aXpmxwo9I65eysZ6WBeAUQ5msrsU/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for Sunvale Tower at Al Furjan",
        "date": "2026-04-06",
        "document": "https://docs.google.com/document/d/1LTLcw_YracHth4xZk8y_4XZABR_0NTis0xFud6mLFNo/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for The Promise Villas by HNB Vision at JVC",
        "date": "2026-04-06",
        "document": "https://docs.google.com/document/d/1uAErlf0ej8eDMS-E8RQOAe2xJ0wmuVqKyVLCdBiO2nA/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for Castleton Central Park at City Walk, Dubai",
        "date": "2026-04-06",
        "document": "https://docs.google.com/document/d/1dFkOoGmqMrireVAOj-PvzeYp3PKHackZvh6XgOH7cAQ/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content of blog Dubai Property Sales Hit Dh176.7 Billion in Q1 2026",
        "date": "2026-04-06",
        "document": "https://docs.google.com/document/d/1GIXtW-V5NcOFl5wPLe815HQHPERjN_jq1zdlOOQv_Mc/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for Courtyard One by Golden Light Real Estate Developments",
        "date": "2026-04-07",
        "document": "https://docs.google.com/document/d/1YjB8jiWg737GtXb1lV0Ap4go-Ldob4bMmYZC35re82c/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Blog on Dubai Issues Over 10,700 Building Permits in Q1 2026 as Construction Activity Accelerates",
        "date": "2026-04-07",
        "document": "https://docs.google.com/document/d/1KleMlDtlN4pdNvyfPk-mxR3Ok6PE8UnrAMVHOlrcZNM/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content on MAAK Residence Dubai South",
        "date": "2026-04-07",
        "document": "https://docs.google.com/document/d/1z1-4YuECoOpiCsrjJLGTeifskEWRAYgyUKkONfz1Bg0/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content on X11 Residence by BAMX Developments at Dubai South",
        "date": "2026-04-07",
        "document": "https://docs.google.com/document/d/1q5UCnj2EycQbcmNLc4vnZqen1zxL19sHt7tONU2yXhM/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for today’s Blog",
        "date": "2026-04-08",
        "document": "https://docs.google.com/document/d/1_8qk-HeaG7g2u0AMm3c_pC5EqH8EmMCRrMQuyFS9nEc/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Richmond District by Mira Developments in Al Furjan",
        "date": "2026-04-08",
        "document": "https://docs.google.com/document/d/1TYz7pTnap85deIeEsqH-D7IyKcwUynBP_965xRrvlaU/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for Vivida Residences at Dubai South",
        "date": "2026-04-09",
        "document": "https://docs.google.com/document/d/1XY3ivCbmt8cjLDQMuIF7M7TdnMf8W-8HIKovYvjjvKM/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for The Harmony by Al Mizan at Dubai South",
        "date": "2026-04-09",
        "document": "https://docs.google.com/document/d/1H4uZs7oKhIH7NaENiBgRrcoyLZCJGi62InyfdW27BQs/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for O1NE District – Dawn at Dubai Motor City",
        "date": "2026-04-09",
        "document": "https://docs.google.com/document/d/1SFIk0jKmlbxPqxlKdUdw5jFcxl5EdqphPUjXfMkY9SA/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for Stories by Mirfa IBC at Dubai South",
        "date": "2026-04-09",
        "document": "https://docs.google.com/document/d/1ratMAnSDl-QMod4p7raWnFFD7E5iP7zOrGTNpm9Uojg/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for     Dubai's Dh422 Million Apartment Sale",
        "date": "2026-04-09",
        "document": "https://docs.google.com/document/d/1VgfmPvBWCE1iioS8LjBJ6q_DD1vKl4o-LVBmjNsrZlA/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for ORVESSA by Michael Adams",
        "date": "2026-04-10",
        "document": "https://docs.google.com/document/d/1IP-7PcBD8MbHLw_ooVawkL6KB_6ai6pbSEjT_-efbBI/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for Blog Dubai Real Estate Market 2026",
        "date": "2026-04-10",
        "document": "https://docs.google.com/document/d/1eN3iEiuz3SYw2GhNdz5eR6t1HnfGBmYsYL8u0tnA6vk/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for Bab Al Qasr Seaview Residence 51 at Al Raha Beach",
        "date": "2026-04-11",
        "document": "https://docs.google.com/document/d/1Gvh-Y_7uSZcRt8sfbe03Se17ZnDO15Posr49--OxWKU/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for Fleur De Jardin Villas at MBR City",
        "date": "2026-04-11",
        "document": "https://docs.google.com/document/d/1Z3ZWgujcor43DhsVLB4L9xeW0_SuRa34p8hYbAyiM8w/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for Lunaya Residences by Zaya in Jebel Ali",
        "date": "2026-04-11",
        "document": "https://docs.google.com/document/d/1sxgZ6Eyn_vVJxNg_uAScoI1BOQFdYRfFyT8S_yBQLMA/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for Radiant Bridges at Al Reem Island, Abu Dhabi",
        "date": "2026-04-11",
        "document": "https://docs.google.com/document/d/1QBYifM3dVS_26c95GndsSQSqlZ2Oipdx7rxg2ozg8JY/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for The Row Phase 2 Saadiyat by Aldar",
        "date": "2026-04-11",
        "document": "https://docs.google.com/document/d/1vOIUUNghPTU1vrr9NSzkwfL9rpAaQVoD_V3p_ONbh1w/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for the Blog Sobha City Abu Dhabi",
        "date": "2026-04-13",
        "document": "https://docs.google.com/document/d/1Cr7BrDsuyP49-OW3Yi0I7fwmwSANbES2BiS_5sOsq1g/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for Empire Gardens by Empire",
        "date": "2026-04-13",
        "document": "https://docs.google.com/document/d/1nIcjn3uaLDU1B3aqzt2wqlGo94j2NWNDIfaxs7sLWZs/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for     Serra Residence at Liwan",
        "date": "2026-04-13",
        "document": "https://docs.google.com/document/d/164i51rHBh2A0FOFhs-YYBzuMaqSMefT_zRU-KRJoOak/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for Chapter 02 by Newbury at Warsan",
        "date": "2026-04-13",
        "document": "https://docs.google.com/document/d/1gZV9GV6dY2V_-xYb33k4YK0aU9Fv36C6oKbSaEIfwFA/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Content for South Lofts at Dubai South",
        "date": "2026-04-13",
        "document": "https://docs.google.com/document/d/1VXhz5l6PUkiho802tkmDgYSCeGmNDJl-FMzblKnZgCQ/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Dh500 Million Commercial Tower Launched in Barsha Heights by National Properties",
        "date": "2026-04-14",
        "document": "https://docs.google.com/document/d/1XvkIuLxrqPtjfqm0ypqToIevhGnDP_OkhAP5-fycojQ/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Sobha City Abu Dhabi",
        "date": "2026-04-14",
        "document": "https://docs.google.com/document/d/1BijgEGzrBn2j5TNKMjc1Zq8JaVXVbuwcNp9gch_AMAw/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Samana Business Hub at Downtown Jebel Ali",
        "date": "2026-04-14",
        "document": "https://docs.google.com/document/d/1WYbL1JLxY86fkGQX46sb9LSoWCftF5pTnPh5quPIX_Q/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Layan at Masaar 3 Phase 5",
        "date": "2026-04-14",
        "document": "https://docs.google.com/document/d/1fB2f-tZbIOjIW5imGx2jXZbtbxqZsINjk_RZOxH9gwg/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "The Harmony by Al Mizan at Dubai South",
        "date": "2026-04-14",
        "document": "https://docs.google.com/document/d/1I4AviiZFb3AlZnYaPhOfVw1iUZ5ZVSzmT1MQKmQF_6c/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Top Emerging Investment Hotspots in Dubai 2026",
        "date": "2026-04-15",
        "document": "https://docs.google.com/document/d/1IYddkkf5b0_e5uGCJcRpJxAlhhYVjUsUlSc-2Gfp-fA/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Dh200 Million Nuvé Residential Project\nLaunched by Zoya Developments in Dubailand",
        "date": "2026-04-15",
        "document": "https://docs.google.com/document/d/1v-R49xu7aC_edzCYi_XZFN-EG_MflzRv32VkQZGBpb8/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Prestige Gardens",
        "date": "2026-04-15",
        "document": "https://docs.google.com/document/d/1WvZyxETyuI6m77JSdQy0IgQoR6aGLt9BZnjSlB-BS9o/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "River Cove Residences at Sobha City",
        "date": "2026-04-15",
        "document": "https://docs.google.com/document/d/11rQ_chjGWObSszSBqGBXXBq8lvn3TG0BF-hAJxI-cJU/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "The Orchard at Sobha City",
        "date": "2026-04-15",
        "document": "https://docs.google.com/document/d/1FOK8s66bektjWRUbMBWIVB7mLzmy1MnR4pfVotv3Ao4/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "The Terraces at Sobha City",
        "date": "2026-04-15",
        "document": "https://docs.google.com/document/d/1hyaJQ5mvmDHHAw1quSGayKe2NCfSJUauNojS5FIBXwk/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Valia Tower at Dubai Creek Harbour",
        "date": "2026-04-17",
        "document": "https://docs.google.com/document/d/1l7DjvL_W09JcbeY5YxQuALtPmdd6a4wvAsrZr5bD9u8/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Hayat 1 at Dubai South",
        "date": "2026-04-17",
        "document": "https://docs.google.com/document/d/1cRfHIrqme76FDtXaSG-lf8u-f4g217wxkLPyThk8eaQ/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Glorious Central Residences at Al Warsan, Dubai",
        "date": "2026-04-17",
        "document": "https://docs.google.com/document/d/1hy7VDeGAMxlrVXXA2yPPwrWQ0iK-fixuHpmL-HjpkJA/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Blog UAE Airlines expand to Over 420 Global Destinations as Ceasefire Eases Travel",
        "date": "2026-04-21",
        "document": "https://docs.google.com/document/d/1dNQaU4uebuy8Et1MfsYmYKQQWM5gtgGomBviBvihzgY/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Summer at Creek Beach",
        "date": "2026-04-21",
        "document": "https://docs.google.com/document/d/1qHQoxQme4mVPQPkOrJ2FLdCmb6zRbZEaLUKWl3gBygk/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Legacy Heights at Dubai South",
        "date": "2026-04-21",
        "document": "https://docs.google.com/document/d/1CcY6ltpOOkjqGLaDs4tBpj5IL-MNjN2R2_u6a0tGvAA/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Cheval Residences at Dubai Islands",
        "date": "2026-04-21",
        "document": "https://docs.google.com/document/d/1zgK0Cm8rdrlCYaog4eZUqyrF4yjoFnignjgvm8ImpLE/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Burj Crown at Downtown Dubai",
        "date": "2026-04-21",
        "document": "https://docs.google.com/document/d/10BvvsQTLhSYnE5wtN99867HBdUshMc5ehvnOP4NvVy0/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Blog Cheval Residences at Dubai Islands",
        "date": "2026-04-21",
        "document": "https://docs.google.com/document/d/1DEthobcdf6VcPF_7BiAHsWT9U43jucWecFOJ_1yXjN8/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Burj Capital Phase 3",
        "date": "2026-04-22",
        "document": "https://docs.google.com/document/d/15eXZC6-5pDO7H6pDrHQYbqW_tYVrqipvA7KtelDIzck/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Jana at Aljada",
        "date": "2026-04-22",
        "document": "https://docs.google.com/document/d/1pw4lOmO02wYEj1di3uyo-L2BAXbXROaPHo_J991IY6Y/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "A Tale of Four Cities",
        "date": "2026-04-22",
        "document": "https://docs.google.com/document/d/11zUuiSwqXq_uyw3X0_LvgGN6oZYZWbednCX55IfnN6o/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Al Vista at Meydan Horizon",
        "date": "2026-04-23",
        "document": "https://docs.google.com/document/d/1dJw1oTPH0v-aeVP4IGqHoN2MPHWy6pA-s0Ygesgi-_Q/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Arlington Park 2 at DLRC",
        "date": "2026-04-23",
        "document": "https://docs.google.com/document/d/13sHRaNdsObuIyfK_smj__B_OzuCl_4_Kk88BYz79wJI/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Tara Park at Reem Island",
        "date": "2026-04-23",
        "document": "https://docs.google.com/document/d/1tAJueRvdCaXWf2KL9-6Jx2p5ZKbT_IOp3iT3Ar9oBdM/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "The Borough at JVC",
        "date": "2026-04-23",
        "document": "https://docs.google.com/document/d/1flBWlLVRsbkt9ZwuLP1VEUplGjEkdZ1bjTBCii76SB8/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Tilal Binghatti at Dubailand",
        "date": "2026-04-23",
        "document": "https://docs.google.com/document/d/1j4cwbJmUXJJ-xIbA2aYahhdoUZXvW3JyVA2bDO7ern8/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Yas Park Place Launch by Aldar Generates Over Dh800 Million in a Record-Breaking Yas Island Sell-Out",
        "date": "2026-04-25",
        "document": "https://docs.google.com/document/d/1_q_CGPbJ4bbZ4O6jCHNardcMsb-rJBYbg3PsL8k__H8/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Ananda Towers at Motor City by Tiger Group",
        "date": "2026-04-27",
        "document": "https://docs.google.com/document/d/1FXRxiJfnOKXn7TeQhC-QVz_gKFRYz_zBtYWNI2405sM/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "FAUCHON Residences by Prestige One Developments at Jumeirah Garden City",
        "date": "2026-04-27",
        "document": "https://docs.google.com/document/d/13MCFyjaqLPqj9-5oXhJEuRNEYOASCE-p5fuw_YtkWKE/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Hawa Residence at Tilal City by Al Marwan Developments",
        "date": "2026-04-27",
        "document": "https://docs.google.com/document/d/1bYrvz8Kdsh8FxZwZDRvMuXGBf2zpZkfNLVbAKu_w08I/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Ramada Residences by Wyndham at Dubai Islands",
        "date": "2026-04-27",
        "document": "https://docs.google.com/document/d/14qpGjBVYexp0d2PfJ5vX6pYq7nItrtshNIjE6YAj9kQ/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Signature Lifestyle Residences at JLT, Dubai",
        "date": "2026-04-27",
        "document": "https://docs.google.com/document/d/1eknmRCcwcJ3Q-Ecvflm-sRFcE_KPLFXidg0jMDIU6mc/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Tomorrow Commercial Tower at Dubai International City",
        "date": "2026-04-27",
        "document": "https://docs.google.com/document/d/1mn_GCK2nvi1pHmAS4FbisYlk_wIBSfDjqll5pTKa3Ug/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Why DMCC’s Twin Office Towers Signal a Major Shift in Dubai Commercial Real Estate",
        "date": "2026-04-27",
        "document": "https://docs.google.com/document/d/1ANjUInbDjKZTeNAEoP8VIfdfli7gMXXHiK-prBDZJRQ/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Dh377 Million Sale for a\nSingle Naïa Island Beachfront Plot",
        "date": "2026-04-28",
        "document": "https://docs.google.com/document/d/1R9H1G9SsJbIjzXwu4Phh3SshhRfDLaVMMbMNhOmFWY0/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "UAE Launches instant Digital Bank Account Service for tourists through \nTourist Identity initiative",
        "date": "2026-05-01",
        "document": "https://docs.google.com/document/d/16YxYLYTKFfqXqvExYEoNLDSQD7l6Fm5T3Kp4Pq-lvDU/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Dubai Residential Visa:\nNo More 7.5 Lakh Dirham Barrier",
        "date": "2026-04-30",
        "document": "https://docs.google.com/document/d/14Wa2WgQdDw1Zpe15SyT5mDKQOjrM6KqyMsf595Z306Y/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Buying Property in Dubai from Israel",
        "date": "2026-05-02",
        "document": "https://docs.google.com/document/d/1edse1WKpV-hLoGfTjeZuX1Ov1nJExbQPHRpHAKGs71w/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Dubai Metro Gold Line",
        "date": "2026-05-02",
        "document": "https://docs.google.com/document/d/1g4LF2K7Jnot2fbUBWecoeJBVT7FECtKC7ea695cepww/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "Meraas Awards Dh2.4 Billion Contracts\nfor Dubailand 557 Villas at The Acres",
        "date": "2026-05-06",
        "document": "https://docs.google.com/document/d/18HQLqTOw6i2vmolK0CeNPHLm-IQ1vqbgCybslWAb5kA/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "How to Transfer Money from Israel to Dubai for a Property Purchase",
        "date": "2026-05-07",
        "document": "https://docs.google.com/document/d/1nmTPJ0Ol08vypCrxAAy_pgj-W2ijC8KbvpcZJdeoJyc/edit?tab=t.0",
        "status": "Draft"
      },
      {
        "project_name": "כיצד להעביר כסף מישראל לדובאי לרכישת נכס?",
        "date": "2026-05-07",
        "document": "https://docs.google.com/document/d/1cv-IcYxQY-eCdYi1NI24qmzYTY8ZujB_miuOtcYdhRU/edit?tab=t.0",
        "status": "Draft"
      }
    ],
    "idBase": 1704231224583
  },
  {
    "name": "Expenses",
    "icon": "💳",
    "columns": [
      { "id": "exp_date",    "name": "Date",         "type": "date",   "width": 120 },
      { "id": "exp_service", "name": "Service Name", "type": "text",   "width": 160 },
      { "id": "exp_billing", "name": "Billing",      "type": "text",   "width": 140 },
      { "id": "exp_type",    "name": "Service Type", "type": "text",   "width": 180 },
      { "id": "exp_url",     "name": "Website",      "type": "url",    "width": 260 },
      { "id": "exp_amount",  "name": "Amount",       "type": "text",   "width": 120 },
      { "id": "exp_status",  "name": "Status",       "type": "status", "width": 110,
        "options": ["Active", "Inactive", "Trial", "Pending"] },
      { "id": "exp_notes",   "name": "Notes",        "type": "text",   "width": 300 }
    ],
    "dedupe": ["exp_service", "exp_date"],
    "idBase": 1750636800000,
    "rows": [
      { "exp_date": "2026-04-04", "exp_service": "PolyTranslate AI",  "exp_billing": "Monthly",           "exp_type": "WordPress Plugin",          "exp_url": "https://wordpress.org/plugins/polytranslate-ai/", "exp_amount": "$3",          "exp_status": "Active",   "exp_notes": "Multilang Translation plugin for Binayah.com" },
      { "exp_date": "2026-04-01", "exp_service": "BrightData",        "exp_billing": "Pay as you go",     "exp_type": "AI Agent",                  "exp_url": "https://brightdata.com/",                        "exp_amount": "$5",          "exp_status": "Active",   "exp_notes": "Scrapper" },
      { "exp_date": "2026-02-04", "exp_service": "Claude AI",         "exp_billing": "Monthly",           "exp_type": "AI Agent",                  "exp_url": "https://claude.ai/",                             "exp_amount": "$20",         "exp_status": "Active",   "exp_notes": "Claude subscription" },
      { "exp_date": "2026-03-07", "exp_service": "News API",          "exp_billing": "5K Tokens",         "exp_type": "News API",                  "exp_url": "https://newsapi.ai/login",                       "exp_amount": "$90",         "exp_status": "Active",   "exp_notes": "API for News" },
      { "exp_date": "2026-04-02", "exp_service": "Kie API",           "exp_billing": "1K Credits",        "exp_type": "Image Generation",          "exp_url": "https://kie.ai/",                                "exp_amount": "$5",          "exp_status": "Active",   "exp_notes": "Image generation" },
      { "exp_date": "2026-03-27", "exp_service": "Hostinger",         "exp_billing": "Monthly",           "exp_type": "VPS Hosting",               "exp_url": "https://hostinger.com/",                         "exp_amount": "$30",         "exp_status": "Active",   "exp_notes": "Hosting for CRM" },
      { "exp_date": "2026-04-04", "exp_service": "Krispcall",         "exp_billing": "Monthly",           "exp_type": "Virtual Number",            "exp_url": "https://krispcall.com/",                         "exp_amount": "$35",         "exp_status": "Active",   "exp_notes": "Virtual Numbers Subscription" },
      { "exp_date": "2026-04-10", "exp_service": "Wanotifier",        "exp_billing": "Monthly",           "exp_type": "Whatsapp Platform",         "exp_url": "https://wanotifier.com/",                        "exp_amount": "$99",         "exp_status": "Active",   "exp_notes": "Whatsapp Marketing" },
      { "exp_date": "2026-04-01", "exp_service": "Whatchipmp",        "exp_billing": "Monthly",           "exp_type": "Whatsapp Platform",         "exp_url": "https://whatchimp.com/",                         "exp_amount": "Not Active",  "exp_status": "Inactive", "exp_notes": "Whatsapp Marketing" },
      { "exp_date": "2026-04-03", "exp_service": "Kendal",            "exp_billing": "Monthly",           "exp_type": "Whatsapp Platform",         "exp_url": "https://app.kendal.ai/",                         "exp_amount": "Trial",       "exp_status": "Trial",    "exp_notes": "Whatsapp Marketing" },
      { "exp_date": "2026-01-04", "exp_service": "Digital Ocean",     "exp_billing": "Monthly",           "exp_type": "CRM Hosting",               "exp_url": "https://cloud.digitalocean.com/",                "exp_amount": "$355.11",     "exp_status": "Active",   "exp_notes": "CRM Hosting" },
      { "exp_date": "2026-04-14", "exp_service": "Fixed.net",         "exp_billing": "Monthly",           "exp_type": "Web Hosting",               "exp_url": "https://my.fixed.net",                           "exp_amount": "£248",        "exp_status": "Active",   "exp_notes": "Webhosting for Binayah.com" },
      { "exp_date": "2026-04-07", "exp_service": "Gemini",            "exp_billing": "",                  "exp_type": "Real Images",               "exp_url": "https://ai.google.dev/",                         "exp_amount": "",            "exp_status": "Active",   "exp_notes": "" },
      { "exp_date": "2026-04-07", "exp_service": "Serper",            "exp_billing": "$0 / 50K Credits",  "exp_type": "SEO Audit",                 "exp_url": "https://serper.dev/",                            "exp_amount": "$50",         "exp_status": "Active",   "exp_notes": "" },
      { "exp_date": "2026-03-20", "exp_service": "SemRush",           "exp_billing": "Monthly",           "exp_type": "SEO Audit",                 "exp_url": "https://www.semrush.com/",                       "exp_amount": "Trial Period", "exp_status": "Trial",   "exp_notes": "For SEO audit and comparison" },
      { "exp_date": "2026-03-18", "exp_service": "AWS",               "exp_billing": "Pay as you go",     "exp_type": "Hosting New CRM DB",        "exp_url": "https://aws.amazon.com/",                        "exp_amount": "Pay as you go","exp_status": "Active",  "exp_notes": "Hosting new CRM database" },
      { "exp_date": "2026-04-07", "exp_service": "MongoDB",           "exp_billing": "$5",                "exp_type": "Database Hosting",          "exp_url": "https://cloud.mongodb.com/",                     "exp_amount": "Pay as you go","exp_status": "Active",  "exp_notes": "" },
      { "exp_date": "",           "exp_service": "Github",            "exp_billing": "",                  "exp_type": "Version Control",           "exp_url": "https://github.com/",                            "exp_amount": "",            "exp_status": "Active",   "exp_notes": "" },
      { "exp_date": "2026-01-03", "exp_service": "Mailgun",           "exp_billing": "Monthly",           "exp_type": "Email Marketing",           "exp_url": "https://www.mailgun.com/",                       "exp_amount": "$15",         "exp_status": "Inactive", "exp_notes": "For email marketing" },
      { "exp_date": "2026-03-09", "exp_service": "1Password",         "exp_billing": "Monthly",           "exp_type": "Login / API Details Storage","exp_url": "https://my.1password.com/",                     "exp_amount": "$24.95",      "exp_status": "Active",   "exp_notes": "For storing login credentials, API credentials etc." },
      { "exp_date": "2026-04-07", "exp_service": "Open Router",       "exp_billing": "10 USD",            "exp_type": "API for Translation",       "exp_url": "https://openrouter.ai/",                         "exp_amount": "$10",         "exp_status": "Active",   "exp_notes": "API key for binayah.com multilang" },
      { "exp_date": "",           "exp_service": "Render",            "exp_billing": "Pending",           "exp_type": "",                          "exp_url": "",                                               "exp_amount": "",            "exp_status": "Pending",  "exp_notes": "" },
      { "exp_date": "2026-06-02", "exp_service": "Claude AI API",     "exp_billing": "Credits",           "exp_type": "AI Agent",                  "exp_url": "https://claude.ai/",                             "exp_amount": "$10.00",      "exp_status": "Active",   "exp_notes": "" },
      { "exp_date": "2026-06-01", "exp_service": "Meta",              "exp_billing": "Pay as you go",     "exp_type": "Whatsapp Business API",     "exp_url": "https://business.facebook.com/",                 "exp_amount": "Pay as you go","exp_status": "Active",  "exp_notes": "For bulk whatsapp and leads notifications" },
      { "exp_date": "2026-06-09", "exp_service": "Password Binaya",   "exp_billing": "Monthly",           "exp_type": "Store Login Credentials",   "exp_url": "https://my.1password.com/",                      "exp_amount": "$24.95",      "exp_status": "Active",   "exp_notes": "Password manager" }
    ]
  }
] satisfies NotionDbSeed[];
