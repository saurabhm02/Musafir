export interface CategoryItem {
  id: string;
  name: string;
  count: string;
  image: string;
}

export interface TripItem {
  id: string;
  title: string;
  duration: string;
  placesCount: string;
  status: "In Progress" | "Completed";
  image: string;
}

export interface PlaceItem {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviewsCount: number;
  tags: string[];
  image: string;
  about?: string;
  bestTime?: string;
}

export interface TripStop {
  id: string;
  name: string;
  time: string;
  description: string;
  image?: string;
}

export const CATEGORIES: CategoryItem[] = [
  {
    id: "mountains",
    name: "Mountains",
    count: "125+ places",
    image: "https://gomusafir.s3.us-east-1.amazonaws.com/ui/cat-mountains.png",
  },
  {
    id: "beaches",
    name: "Beaches",
    count: "98+ places",
    image: "https://gomusafir.s3.us-east-1.amazonaws.com/ui/cat-beaches.png",
  },
  {
    id: "temples",
    name: "Temples",
    count: "76+ places",
    image: "https://gomusafir.s3.us-east-1.amazonaws.com/ui/cat-temples.png",
  },
  {
    id: "adventures",
    name: "Adventures",
    count: "120+ places",
    image: "https://gomusafir.s3.us-east-1.amazonaws.com/ui/cat-adventures.png",
  },
];

export const RECENT_TRIPS: TripItem[] = [
  {
    id: "manali",
    title: "Manali Trip",
    duration: "4 Days",
    placesCount: "12 Places",
    status: "In Progress",
    image: "https://gomusafir.s3.us-east-1.amazonaws.com/ui/trip-manali.png",
  },
  {
    id: "goa",
    title: "Goa Getaway",
    duration: "3 Days",
    placesCount: "8 Places",
    status: "Completed",
    image: "https://gomusafir.s3.us-east-1.amazonaws.com/ui/trip-goa.png",
  },
];

export const POPULAR_SEARCHES = ["Manali", "Goa", "Ladakh", "Kerala", "Rishikesh"];

export const RECOMMENDED_PLACES: PlaceItem[] = [
  {
    id: "spiti",
    name: "Spiti Valley",
    location: "Himachal Pradesh",
    rating: 4.8,
    reviewsCount: 230,
    tags: ["Mountains", "Adventure"],
    image: "https://gomusafir.s3.us-east-1.amazonaws.com/ui/place-spiti.png",
    about: "A high-altitude mountain valley located in the Himalayas, renowned for ancient Tibetan monasteries, rugged terrain, and crystal-clear starscapes.",
    bestTime: "June to October",
  },
  {
    id: "udaipur",
    name: "Udaipur",
    location: "Rajasthan",
    rating: 4.7,
    reviewsCount: 180,
    tags: ["Temples", "Culture"],
    image: "https://gomusafir.s3.us-east-1.amazonaws.com/ui/place-udaipur.png",
    about: "Known as the City of Lakes, crowned by the opulent City Palace, historic ghats, and romantic boat cruises on Lake Pichola.",
    bestTime: "October to March",
  },
  {
    id: "gokarna",
    name: "Gokarna",
    location: "Karnataka",
    rating: 4.6,
    reviewsCount: 150,
    tags: ["Beaches", "Relaxation"],
    image: "https://gomusafir.s3.us-east-1.amazonaws.com/ui/place-gokarna.png",
    about: "A peaceful coastal sanctuary known for Om Beach, Kudle Beach, cliffside sunset treks, and tranquil Arabian Sea views.",
    bestTime: "October to March",
  },
  {
    id: "munnar",
    name: "Munnar",
    location: "Kerala",
    rating: 4.6,
    reviewsCount: 200,
    tags: ["Hills", "Nature"],
    image: "https://gomusafir.s3.us-east-1.amazonaws.com/ui/place-munnar.png",
    about: "A serene hill station covered in rolling emerald tea plantations, misty valleys, waterfalls, and cool mountain breezes.",
    bestTime: "September to May",
  },
  {
    id: "hidimba",
    name: "Hidimba Temple",
    location: "Manali, Himachal Pradesh",
    rating: 4.7,
    reviewsCount: 340,
    tags: ["Temples", "Heritage"],
    image: "https://gomusafir.s3.us-east-1.amazonaws.com/ui/place-hidimba-hero.png",
    about: "An ancient cave temple dedicated to Hidimba Devi, surrounded by cedar forests. A peaceful and spiritual experience.",
    bestTime: "March to June, September to February",
  },
];

export const TRIP_DAYS = [
  {
    day: 1,
    title: "Day 1",
    stops: [
      {
        id: "stop-1",
        name: "Solang Valley",
        time: "9:00 AM – 11:30 AM",
        description: "Beautiful valley surrounded by majestic mountains. Perfect start to your trip.",
        image: "https://gomusafir.s3.us-east-1.amazonaws.com/ui/stop-solang.png",
      },
      {
        id: "stop-2",
        name: "Atal Tunnel",
        time: "12:30 PM",
        description: "Iconic Himalayan tunnel connecting Manali to Lahaul valley.",
      },
      {
        id: "stop-3",
        name: "Hidimba Temple",
        time: "3:00 PM",
        description: "Ancient wooden temple dedicated to Hidimba Devi surrounded by cedar forests.",
        image: "https://gomusafir.s3.us-east-1.amazonaws.com/ui/place-hidimba-hero.png",
      },
      {
        id: "stop-4",
        name: "Mall Road",
        time: "6:30 PM",
        description: "Lively evening street with cozy cafes, shopping, and local delicacies.",
      },
    ],
  },
  {
    day: 2,
    title: "Day 2",
    stops: [
      {
        id: "stop-5",
        name: "Rohtang Pass",
        time: "8:30 AM – 1:00 PM",
        description: "High mountain pass with panoramic snow peaks and adventure activities.",
      },
      {
        id: "stop-6",
        name: "Vashisht Hot Springs",
        time: "3:30 PM",
        description: "Natural sulfur hot water springs and ancient stone temple.",
      },
      {
        id: "stop-7",
        name: "Old Manali Cafes",
        time: "6:00 PM",
        description: "Charming cafes with live acoustic music and mountain views.",
      },
    ],
  },
  {
    day: 3,
    title: "Day 3",
    stops: [
      {
        id: "stop-8",
        name: "Naggar Castle",
        time: "10:00 AM – 1:00 PM",
        description: "Historic wood-and-stone castle overlooking the Kullu valley.",
      },
      {
        id: "stop-9",
        name: "Jana Waterfall",
        time: "2:30 PM",
        description: "Picturesque waterfall spot famous for traditional Himachali thali.",
      },
    ],
  },
  {
    day: 4,
    title: "Day 4",
    stops: [
      {
        id: "stop-10",
        name: "Jogini Waterfalls",
        time: "9:00 AM – 12:00 PM",
        description: "Scenic pine forest trek leading to cascading mountain waters.",
      },
      {
        id: "stop-11",
        name: "Manu Temple",
        time: "2:00 PM",
        description: "Pagoda-style temple dedicated to Sage Manu in Old Manali.",
      },
    ],
  },
];
