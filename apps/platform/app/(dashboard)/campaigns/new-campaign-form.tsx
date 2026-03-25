'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_SUBJECT = `quick question about {{businessName}}`;

const DEFAULT_BODY = `<div style="font-family: Arial, sans-serif; max-width: 540px; color: #1a1a1a; line-height: 1.65; font-size: 15px;">
  <p>Hey {{businessName}},</p>

  <p>
    I run an AI automation agency built specifically for restaurants. We build three things
    for our clients: a custom AI phone receptionist, a custom AI chatbot and a professional website.
  </p>

  <p>
    Here is how it works. When a customer calls and you are busy or closed, the call automatically
    routes to your AI phone agent. It answers questions, takes orders and books reservations just
    like a real staff member would. On top of that, we embed an AI chatbot into your website that
    does the same thing for online visitors.
  </p>

  <p>
    I would love to jump on a quick call and demo what this would look like for {{businessName}}.
    No pressure, just want to show you what is possible.
  </p>

  <table style="margin-top: 28px; border-top: 1px solid #eee; padding-top: 20px; border-collapse: collapse; width: 100%;" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding-right: 12px; vertical-align: middle; width: 56px;">
        <img src="https://i.imgur.com/RDXkWkD.jpeg" alt="Jason" width="48" height="48" style="border-radius: 50%; display: block; object-fit: cover;" />
      </td>
      <td style="vertical-align: middle;">
        <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1a1a1a;">Jason</p>
        <p style="margin: 2px 0 0; font-size: 13px; color: #666;">Founder · <a href="https://embedo.io" style="color: #4f46e5; text-decoration: none;">embedo.io</a></p>
      </td>
    </tr>
  </table>

  <p style="margin-top: 32px; font-size: 11px; color: #bbb;">
    Saw your restaurant in a local search. Not interested?
    <a href="mailto:{{replyEmail}}?subject=Unsubscribe" style="color: #bbb;">Unsubscribe</a>
  </p>
</div>`;

// Pre-validated US cities with confirmed coordinates for Geoapify Places search.
// Lat/lon stored here — bypasses geocoding entirely at campaign run time.
const US_CITIES = [
  // Alabama
  { city: 'Birmingham', state: 'AL', lat: 33.5186, lon: -86.8104 },
  { city: 'Montgomery', state: 'AL', lat: 32.3668, lon: -86.2999 },
  { city: 'Huntsville', state: 'AL', lat: 34.7304, lon: -86.5861 },
  { city: 'Mobile', state: 'AL', lat: 30.6954, lon: -88.0399 },
  // Alaska
  { city: 'Anchorage', state: 'AK', lat: 61.2181, lon: -149.9003 },
  // Arizona
  { city: 'Phoenix', state: 'AZ', lat: 33.4484, lon: -112.0740 },
  { city: 'Tucson', state: 'AZ', lat: 32.2226, lon: -110.9747 },
  { city: 'Scottsdale', state: 'AZ', lat: 33.4942, lon: -111.9261 },
  { city: 'Mesa', state: 'AZ', lat: 33.4152, lon: -111.8315 },
  { city: 'Chandler', state: 'AZ', lat: 33.3062, lon: -111.8413 },
  { city: 'Tempe', state: 'AZ', lat: 33.4255, lon: -111.9400 },
  { city: 'Glendale', state: 'AZ', lat: 33.5387, lon: -112.1860 },
  // Arkansas
  { city: 'Little Rock', state: 'AR', lat: 34.7465, lon: -92.2896 },
  { city: 'Fayetteville', state: 'AR', lat: 36.0626, lon: -94.1574 },
  // California
  { city: 'Los Angeles', state: 'CA', lat: 34.0522, lon: -118.2437 },
  { city: 'San Francisco', state: 'CA', lat: 37.7749, lon: -122.4194 },
  { city: 'San Diego', state: 'CA', lat: 32.7157, lon: -117.1611 },
  { city: 'San Jose', state: 'CA', lat: 37.3382, lon: -121.8863 },
  { city: 'Sacramento', state: 'CA', lat: 38.5816, lon: -121.4944 },
  { city: 'Fresno', state: 'CA', lat: 36.7378, lon: -119.7871 },
  { city: 'Long Beach', state: 'CA', lat: 33.7701, lon: -118.1937 },
  { city: 'Oakland', state: 'CA', lat: 37.8044, lon: -122.2712 },
  { city: 'Bakersfield', state: 'CA', lat: 35.3733, lon: -119.0187 },
  { city: 'Anaheim', state: 'CA', lat: 33.8366, lon: -117.9143 },
  { city: 'Riverside', state: 'CA', lat: 33.9806, lon: -117.3755 },
  { city: 'Irvine', state: 'CA', lat: 33.6846, lon: -117.8265 },
  { city: 'Santa Barbara', state: 'CA', lat: 34.4208, lon: -119.6982 },
  { city: 'Pasadena', state: 'CA', lat: 34.1478, lon: -118.1445 },
  { city: 'Beverly Hills', state: 'CA', lat: 34.0736, lon: -118.4004 },
  { city: 'Santa Monica', state: 'CA', lat: 34.0195, lon: -118.4912 },
  { city: 'Burbank', state: 'CA', lat: 34.1808, lon: -118.3090 },
  { city: 'Glendale', state: 'CA', lat: 34.1425, lon: -118.2551 },
  // Colorado
  { city: 'Denver', state: 'CO', lat: 39.7392, lon: -104.9903 },
  { city: 'Colorado Springs', state: 'CO', lat: 38.8339, lon: -104.8214 },
  { city: 'Aurora', state: 'CO', lat: 39.7294, lon: -104.8319 },
  { city: 'Fort Collins', state: 'CO', lat: 40.5853, lon: -105.0844 },
  { city: 'Boulder', state: 'CO', lat: 40.0150, lon: -105.2705 },
  // Connecticut
  { city: 'Hartford', state: 'CT', lat: 41.7658, lon: -72.6851 },
  { city: 'New Haven', state: 'CT', lat: 41.3083, lon: -72.9279 },
  { city: 'Stamford', state: 'CT', lat: 41.0534, lon: -73.5387 },
  // Delaware
  { city: 'Wilmington', state: 'DE', lat: 39.7447, lon: -75.5484 },
  { city: 'Dover', state: 'DE', lat: 39.1582, lon: -75.5244 },
  // Florida
  { city: 'Miami', state: 'FL', lat: 25.7617, lon: -80.1918 },
  { city: 'Miami Beach', state: 'FL', lat: 25.7907, lon: -80.1300 },
  { city: 'Orlando', state: 'FL', lat: 28.5383, lon: -81.3792 },
  { city: 'Tampa', state: 'FL', lat: 27.9506, lon: -82.4572 },
  { city: 'Jacksonville', state: 'FL', lat: 30.3322, lon: -81.6557 },
  { city: 'Fort Lauderdale', state: 'FL', lat: 26.1224, lon: -80.1373 },
  { city: 'West Palm Beach', state: 'FL', lat: 26.7153, lon: -80.0534 },
  { city: 'St. Petersburg', state: 'FL', lat: 27.7676, lon: -82.6403 },
  { city: 'Hialeah', state: 'FL', lat: 25.8576, lon: -80.2781 },
  { city: 'Tallahassee', state: 'FL', lat: 30.4518, lon: -84.2807 },
  { city: 'Cape Coral', state: 'FL', lat: 26.5629, lon: -81.9495 },
  { city: 'Boca Raton', state: 'FL', lat: 26.3683, lon: -80.1289 },
  { city: 'Naples', state: 'FL', lat: 26.1420, lon: -81.7948 },
  { city: 'Sarasota', state: 'FL', lat: 27.3364, lon: -82.5307 },
  { city: 'Gainesville', state: 'FL', lat: 29.6516, lon: -82.3248 },
  { city: 'Clearwater', state: 'FL', lat: 27.9659, lon: -82.8001 },
  // Georgia
  { city: 'Atlanta', state: 'GA', lat: 33.7490, lon: -84.3880 },
  { city: 'Savannah', state: 'GA', lat: 32.0835, lon: -81.0998 },
  { city: 'Augusta', state: 'GA', lat: 33.4735, lon: -82.0105 },
  { city: 'Columbus', state: 'GA', lat: 32.4610, lon: -84.9877 },
  { city: 'Macon', state: 'GA', lat: 32.8407, lon: -83.6324 },
  // Hawaii
  { city: 'Honolulu', state: 'HI', lat: 21.3069, lon: -157.8583 },
  // Idaho
  { city: 'Boise', state: 'ID', lat: 43.6150, lon: -116.2023 },
  // Illinois
  { city: 'Chicago', state: 'IL', lat: 41.8781, lon: -87.6298 },
  { city: 'Naperville', state: 'IL', lat: 41.7508, lon: -88.1535 },
  { city: 'Springfield', state: 'IL', lat: 39.7817, lon: -89.6501 },
  { city: 'Rockford', state: 'IL', lat: 42.2711, lon: -89.0940 },
  { city: 'Evanston', state: 'IL', lat: 42.0451, lon: -87.6877 },
  // Indiana
  { city: 'Indianapolis', state: 'IN', lat: 39.7684, lon: -86.1581 },
  { city: 'Fort Wayne', state: 'IN', lat: 41.1306, lon: -85.1289 },
  { city: 'Evansville', state: 'IN', lat: 37.9748, lon: -87.5558 },
  // Iowa
  { city: 'Des Moines', state: 'IA', lat: 41.5868, lon: -93.6250 },
  { city: 'Cedar Rapids', state: 'IA', lat: 41.9779, lon: -91.6656 },
  // Kansas
  { city: 'Wichita', state: 'KS', lat: 37.6872, lon: -97.3301 },
  { city: 'Kansas City', state: 'KS', lat: 39.1141, lon: -94.6275 },
  { city: 'Topeka', state: 'KS', lat: 39.0558, lon: -95.6894 },
  // Kentucky
  { city: 'Louisville', state: 'KY', lat: 38.2527, lon: -85.7585 },
  { city: 'Lexington', state: 'KY', lat: 38.0406, lon: -84.5037 },
  // Louisiana
  { city: 'New Orleans', state: 'LA', lat: 29.9511, lon: -90.0715 },
  { city: 'Baton Rouge', state: 'LA', lat: 30.4515, lon: -91.1871 },
  { city: 'Shreveport', state: 'LA', lat: 32.5252, lon: -93.7502 },
  // Maine
  { city: 'Portland', state: 'ME', lat: 43.6591, lon: -70.2568 },
  // Maryland
  { city: 'Baltimore', state: 'MD', lat: 39.2904, lon: -76.6122 },
  { city: 'Bethesda', state: 'MD', lat: 38.9807, lon: -77.1000 },
  { city: 'Silver Spring', state: 'MD', lat: 38.9957, lon: -77.0263 },
  { city: 'Annapolis', state: 'MD', lat: 38.9784, lon: -76.4922 },
  // Massachusetts
  { city: 'Boston', state: 'MA', lat: 42.3601, lon: -71.0589 },
  { city: 'Cambridge', state: 'MA', lat: 42.3736, lon: -71.1097 },
  { city: 'Worcester', state: 'MA', lat: 42.2626, lon: -71.8023 },
  { city: 'Somerville', state: 'MA', lat: 42.3876, lon: -71.0995 },
  // Michigan
  { city: 'Detroit', state: 'MI', lat: 42.3314, lon: -83.0458 },
  { city: 'Grand Rapids', state: 'MI', lat: 42.9634, lon: -85.6681 },
  { city: 'Lansing', state: 'MI', lat: 42.7325, lon: -84.5555 },
  { city: 'Ann Arbor', state: 'MI', lat: 42.2808, lon: -83.7430 },
  // Minnesota
  { city: 'Minneapolis', state: 'MN', lat: 44.9778, lon: -93.2650 },
  { city: 'Saint Paul', state: 'MN', lat: 44.9537, lon: -93.0900 },
  { city: 'Rochester', state: 'MN', lat: 44.0121, lon: -92.4802 },
  // Mississippi
  { city: 'Jackson', state: 'MS', lat: 32.2988, lon: -90.1848 },
  { city: 'Biloxi', state: 'MS', lat: 30.3960, lon: -88.8853 },
  // Missouri
  { city: 'Kansas City', state: 'MO', lat: 39.0997, lon: -94.5786 },
  { city: 'St. Louis', state: 'MO', lat: 38.6270, lon: -90.1994 },
  { city: 'Springfield', state: 'MO', lat: 37.2090, lon: -93.2923 },
  // Montana
  { city: 'Billings', state: 'MT', lat: 45.7833, lon: -108.5007 },
  { city: 'Missoula', state: 'MT', lat: 46.8721, lon: -113.9940 },
  // Nebraska
  { city: 'Omaha', state: 'NE', lat: 41.2565, lon: -95.9345 },
  { city: 'Lincoln', state: 'NE', lat: 40.8136, lon: -96.7026 },
  // Nevada
  { city: 'Las Vegas', state: 'NV', lat: 36.1699, lon: -115.1398 },
  { city: 'Henderson', state: 'NV', lat: 36.0395, lon: -114.9817 },
  { city: 'Reno', state: 'NV', lat: 39.5296, lon: -119.8138 },
  { city: 'North Las Vegas', state: 'NV', lat: 36.1989, lon: -115.1175 },
  // New Hampshire
  { city: 'Manchester', state: 'NH', lat: 42.9956, lon: -71.4548 },
  { city: 'Portsmouth', state: 'NH', lat: 43.0718, lon: -70.7626 },
  // New Jersey
  { city: 'Newark', state: 'NJ', lat: 40.7357, lon: -74.1724 },
  { city: 'Jersey City', state: 'NJ', lat: 40.7178, lon: -74.0431 },
  { city: 'Hoboken', state: 'NJ', lat: 40.7440, lon: -74.0324 },
  { city: 'Edison', state: 'NJ', lat: 40.5187, lon: -74.4121 },
  { city: 'Trenton', state: 'NJ', lat: 40.2171, lon: -74.7429 },
  { city: 'Princeton', state: 'NJ', lat: 40.3573, lon: -74.6672 },
  { city: 'Atlantic City', state: 'NJ', lat: 39.3643, lon: -74.4229 },
  { city: 'Cherry Hill', state: 'NJ', lat: 39.9348, lon: -75.0241 },
  { city: 'Paterson', state: 'NJ', lat: 40.9168, lon: -74.1718 },
  // New Mexico
  { city: 'Albuquerque', state: 'NM', lat: 35.0844, lon: -106.6504 },
  { city: 'Santa Fe', state: 'NM', lat: 35.6870, lon: -105.9378 },
  // New York
  { city: 'New York City', state: 'NY', lat: 40.7128, lon: -74.0060 },
  { city: 'Manhattan', state: 'NY', lat: 40.7831, lon: -73.9712 },
  { city: 'Brooklyn', state: 'NY', lat: 40.6782, lon: -73.9442 },
  { city: 'Queens', state: 'NY', lat: 40.7282, lon: -73.7949 },
  { city: 'Bronx', state: 'NY', lat: 40.8448, lon: -73.8648 },
  { city: 'Buffalo', state: 'NY', lat: 42.8864, lon: -78.8784 },
  { city: 'Rochester', state: 'NY', lat: 43.1566, lon: -77.6088 },
  { city: 'Syracuse', state: 'NY', lat: 43.0481, lon: -76.1474 },
  { city: 'Albany', state: 'NY', lat: 42.6526, lon: -73.7562 },
  { city: 'Yonkers', state: 'NY', lat: 40.9312, lon: -73.8988 },
  { city: 'Astoria', state: 'NY', lat: 40.7721, lon: -73.9302 },
  { city: 'Flushing', state: 'NY', lat: 40.7675, lon: -73.8330 },
  // North Carolina
  { city: 'Charlotte', state: 'NC', lat: 35.2271, lon: -80.8431 },
  { city: 'Raleigh', state: 'NC', lat: 35.7796, lon: -78.6382 },
  { city: 'Greensboro', state: 'NC', lat: 36.0726, lon: -79.7920 },
  { city: 'Durham', state: 'NC', lat: 35.9940, lon: -78.8986 },
  { city: 'Winston-Salem', state: 'NC', lat: 36.0999, lon: -80.2442 },
  { city: 'Chapel Hill', state: 'NC', lat: 35.9132, lon: -79.0558 },
  { city: 'Asheville', state: 'NC', lat: 35.5951, lon: -82.5515 },
  // North Dakota
  { city: 'Fargo', state: 'ND', lat: 46.8772, lon: -96.7898 },
  { city: 'Bismarck', state: 'ND', lat: 46.8083, lon: -100.7837 },
  // Ohio
  { city: 'Columbus', state: 'OH', lat: 39.9612, lon: -82.9988 },
  { city: 'Cleveland', state: 'OH', lat: 41.4993, lon: -81.6944 },
  { city: 'Cincinnati', state: 'OH', lat: 39.1031, lon: -84.5120 },
  { city: 'Toledo', state: 'OH', lat: 41.6528, lon: -83.5379 },
  { city: 'Akron', state: 'OH', lat: 41.0814, lon: -81.5190 },
  { city: 'Dayton', state: 'OH', lat: 39.7589, lon: -84.1916 },
  // Oklahoma
  { city: 'Oklahoma City', state: 'OK', lat: 35.4676, lon: -97.5164 },
  { city: 'Tulsa', state: 'OK', lat: 36.1540, lon: -95.9928 },
  // Oregon
  { city: 'Portland', state: 'OR', lat: 45.5051, lon: -122.6750 },
  { city: 'Eugene', state: 'OR', lat: 44.0521, lon: -123.0868 },
  { city: 'Salem', state: 'OR', lat: 44.9429, lon: -123.0351 },
  { city: 'Bend', state: 'OR', lat: 44.0582, lon: -121.3153 },
  // Pennsylvania
  { city: 'Philadelphia', state: 'PA', lat: 39.9526, lon: -75.1652 },
  { city: 'Pittsburgh', state: 'PA', lat: 40.4406, lon: -79.9959 },
  { city: 'Allentown', state: 'PA', lat: 40.6084, lon: -75.4902 },
  { city: 'Erie', state: 'PA', lat: 42.1292, lon: -80.0851 },
  // Rhode Island
  { city: 'Providence', state: 'RI', lat: 41.8240, lon: -71.4128 },
  // South Carolina
  { city: 'Charleston', state: 'SC', lat: 32.7765, lon: -79.9311 },
  { city: 'Columbia', state: 'SC', lat: 34.0007, lon: -81.0348 },
  { city: 'Greenville', state: 'SC', lat: 34.8526, lon: -82.3940 },
  { city: 'Myrtle Beach', state: 'SC', lat: 33.6891, lon: -78.8867 },
  // South Dakota
  { city: 'Sioux Falls', state: 'SD', lat: 43.5446, lon: -96.7311 },
  // Tennessee
  { city: 'Nashville', state: 'TN', lat: 36.1627, lon: -86.7816 },
  { city: 'Memphis', state: 'TN', lat: 35.1495, lon: -90.0490 },
  { city: 'Knoxville', state: 'TN', lat: 35.9606, lon: -83.9207 },
  { city: 'Chattanooga', state: 'TN', lat: 35.0456, lon: -85.3097 },
  // Texas
  { city: 'Houston', state: 'TX', lat: 29.7604, lon: -95.3698 },
  { city: 'San Antonio', state: 'TX', lat: 29.4241, lon: -98.4936 },
  { city: 'Dallas', state: 'TX', lat: 32.7767, lon: -96.7970 },
  { city: 'Austin', state: 'TX', lat: 30.2672, lon: -97.7431 },
  { city: 'Fort Worth', state: 'TX', lat: 32.7555, lon: -97.3308 },
  { city: 'El Paso', state: 'TX', lat: 31.7619, lon: -106.4850 },
  { city: 'Arlington', state: 'TX', lat: 32.7357, lon: -97.1081 },
  { city: 'Plano', state: 'TX', lat: 33.0198, lon: -96.6989 },
  { city: 'Lubbock', state: 'TX', lat: 33.5779, lon: -101.8552 },
  { city: 'Corpus Christi', state: 'TX', lat: 27.8006, lon: -97.3964 },
  { city: 'Garland', state: 'TX', lat: 32.9126, lon: -96.6389 },
  { city: 'Irving', state: 'TX', lat: 32.8140, lon: -96.9489 },
  { city: 'Frisco', state: 'TX', lat: 33.1507, lon: -96.8236 },
  { city: 'McKinney', state: 'TX', lat: 33.1972, lon: -96.6397 },
  { city: 'Laredo', state: 'TX', lat: 27.5064, lon: -99.5075 },
  { city: 'Amarillo', state: 'TX', lat: 35.2220, lon: -101.8313 },
  // Utah
  { city: 'Salt Lake City', state: 'UT', lat: 40.7608, lon: -111.8910 },
  { city: 'Provo', state: 'UT', lat: 40.2338, lon: -111.6585 },
  { city: 'Ogden', state: 'UT', lat: 41.2230, lon: -111.9738 },
  // Vermont
  { city: 'Burlington', state: 'VT', lat: 44.4759, lon: -73.2121 },
  // Virginia
  { city: 'Virginia Beach', state: 'VA', lat: 36.8529, lon: -75.9780 },
  { city: 'Norfolk', state: 'VA', lat: 36.8508, lon: -76.2859 },
  { city: 'Richmond', state: 'VA', lat: 37.5407, lon: -77.4360 },
  { city: 'Arlington', state: 'VA', lat: 38.8816, lon: -77.0910 },
  { city: 'Alexandria', state: 'VA', lat: 38.8048, lon: -77.0469 },
  { city: 'Roanoke', state: 'VA', lat: 37.2710, lon: -79.9414 },
  // Washington
  { city: 'Seattle', state: 'WA', lat: 47.6062, lon: -122.3321 },
  { city: 'Spokane', state: 'WA', lat: 47.6588, lon: -117.4260 },
  { city: 'Tacoma', state: 'WA', lat: 47.2529, lon: -122.4443 },
  { city: 'Bellevue', state: 'WA', lat: 47.6101, lon: -122.2015 },
  { city: 'Kirkland', state: 'WA', lat: 47.6815, lon: -122.2087 },
  { city: 'Redmond', state: 'WA', lat: 47.6740, lon: -122.1215 },
  // West Virginia
  { city: 'Charleston', state: 'WV', lat: 38.3498, lon: -81.6326 },
  // Wisconsin
  { city: 'Milwaukee', state: 'WI', lat: 43.0389, lon: -87.9065 },
  { city: 'Madison', state: 'WI', lat: 43.0731, lon: -89.4012 },
  { city: 'Green Bay', state: 'WI', lat: 44.5133, lon: -88.0133 },
  // Wyoming
  { city: 'Cheyenne', state: 'WY', lat: 41.1400, lon: -104.8202 },
  // DC
  { city: 'Washington', state: 'DC', lat: 38.9072, lon: -77.0369 },
];

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'Washington DC' },
];

interface CityEntry { city: string; state: string; lat: number; lon: number }

export function NewCampaignForm({ prospectorUrl }: { prospectorUrl: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiPreviewHtml, setAiPreviewHtml] = useState('');
  const [aiPreviewing, setAiPreviewing] = useState(false);
  const [aiPreviewOpen, setAiPreviewOpen] = useState(false);

  // Location
  const [selectedState, setSelectedState] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [selectedCity, setSelectedCity] = useState<CityEntry | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [discoverySource, setDiscoverySource] = useState<'geoapify' | 'apollo'>('geoapify');
  const [apolloIndustries, setApolloIndustries] = useState<string[]>([]);
  const [apolloEmployeeRange, setApolloEmployeeRange] = useState('1,10');

  const [form, setForm] = useState({
    name: '',
    targetIndustry: 'RESTAURANT',
    maxProspects: '50',
    emailSubject: DEFAULT_SUBJECT,
    emailBodyHtml: DEFAULT_BODY,
  });

  useEffect(() => {
    fetch(`${prospectorUrl}/ai/status`)
      .then((r) => r.json())
      .then((d: { aiEnabled?: boolean }) => setAiEnabled(d.aiEnabled ?? false))
      .catch(() => setAiEnabled(false));
  }, [prospectorUrl]);

  // Client-side filter — instant, no API call
  const suggestions: CityEntry[] = cityInput.length >= 1
    ? US_CITIES.filter((c) => {
        const matchState = !selectedState || c.state === selectedState;
        const matchCity = c.city.toLowerCase().startsWith(cityInput.toLowerCase());
        return matchState && matchCity;
      }).slice(0, 8)
    : selectedState
      ? US_CITIES.filter((c) => c.state === selectedState).slice(0, 8)
      : [];

  function onStateChange(code: string) {
    setSelectedState(code);
    setSelectedCity(null);
    setCityInput('');
    setShowSuggestions(true);
  }

  function onCityInputChange(value: string) {
    setCityInput(value);
    setSelectedCity(null);
    setShowSuggestions(true);
  }

  function selectCity(c: CityEntry) {
    setCityInput(c.city);
    setSelectedCity(c);
    if (!selectedState) setSelectedState(c.state);
    setShowSuggestions(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCity) {
      setError('Please select a city from the dropdown.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        ...form,
        targetCity: `${selectedCity.city}, ${selectedCity.state}`,
        targetState: selectedCity.state,
        targetCountry: 'US',
        targetLat: selectedCity.lat,
        targetLon: selectedCity.lon,
        maxProspects: form.maxProspects === 'unlimited' ? null : parseInt(form.maxProspects),
        discoverySource,
      };
      if (discoverySource === 'apollo') {
        payload.apolloIndustries = apolloIndustries.length > 0 ? apolloIndustries : undefined;
        payload.apolloEmployeeRanges = [apolloEmployeeRange];
      }
      const res = await fetch(`${prospectorUrl}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to create campaign');
        return;
      }
      router.refresh();
      setOpen(false);
      setForm({ ...form, name: '', maxProspects: '50' });
      setCityInput('');
      setSelectedState('');
      setSelectedCity(null);
    } catch {
      setError('Network error — is the prospector service running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleAiPreview() {
    setAiPreviewing(true);
    setAiPreviewOpen(true);
    setAiPreviewHtml('');
    try {
      const res = await fetch(`${prospectorUrl}/ai/preview-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || 'Acme Restaurant',
          city: selectedCity ? selectedCity.city : 'New York',
          website: 'acmerestaurant.com',
          googleRating: 4.3,
          googleReviewCount: 218,
        }),
      });
      const data = (await res.json()) as { html?: string; error?: string };
      if (!res.ok || !data.html) {
        setAiPreviewHtml(`<p style="color:red">Error: ${data.error ?? 'Generation failed'}</p>`);
        return;
      }
      setAiPreviewHtml(data.html);
    } catch {
      setAiPreviewHtml(`<p style="color:red">Network error</p>`);
    } finally {
      setAiPreviewing(false);
    }
  }

  const inputCls = "w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-colors";
  const selectCls = "w-full px-3 py-2.5 bg-[#12101f] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-colors appearance-none";
  const optionCls = "bg-[#12101f] text-white";
  const labelCls = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors"
      >
        + New Campaign
      </button>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        {aiEnabled && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-violet-500/10 border border-violet-500/25 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse flex-shrink-0" />
            <p className="text-xs text-violet-300">
              <span className="font-semibold">AI personalization active</span>
              {' '}— Claude will write a unique email for each prospect at send time using their business name, city, Google rating, and website. The template below is used as a fallback only.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Campaign Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="NYC Restaurants Q1"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Industry</label>
            <select
              value={form.targetIndustry}
              onChange={(e) => setForm({ ...form, targetIndustry: e.target.value })}
              className={selectCls}
            >
              <option value="RESTAURANT" className={optionCls}>Restaurant</option>
              <option value="SALON" className={optionCls}>Salon</option>
              <option value="RETAIL" className={optionCls}>Retail</option>
              <option value="FITNESS" className={optionCls}>Fitness</option>
              <option value="MEDICAL" className={optionCls}>Medical</option>
              <option value="OTHER" className={optionCls}>Other</option>
            </select>
          </div>
        </div>

        {/* Discovery Source Toggle */}
        <div>
          <label className={labelCls}>Discovery Source</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDiscoverySource('geoapify')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                discoverySource === 'geoapify'
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20'
              }`}
            >
              Geoapify (Places)
            </button>
            <button
              type="button"
              onClick={() => setDiscoverySource('apollo')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                discoverySource === 'apollo'
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20'
              }`}
            >
              Apollo (People)
            </button>
          </div>
          <p className="text-[10px] text-slate-600 mt-1.5">
            {discoverySource === 'geoapify'
              ? 'Finds businesses via Google Maps data. Best for discovering local restaurants by location.'
              : 'Finds businesses and their owners/managers via Apollo.io. Best for finding decision-makers with verified emails.'}
          </p>
        </div>

        {/* Apollo-specific options */}
        {discoverySource === 'apollo' && (
          <div className="space-y-4 p-4 bg-violet-500/5 border border-violet-500/15 rounded-lg">
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide">Apollo Settings</p>

            <div>
              <label className={labelCls}>Industry Keywords</label>
              <input
                value={apolloIndustries.join(', ')}
                onChange={(e) => setApolloIndustries(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                placeholder="restaurants, food service, hospitality"
                className={inputCls}
              />
              <p className="text-[10px] text-slate-600 mt-1">Comma-separated. Leave blank to search all industries.</p>
            </div>

            <div>
              <label className={labelCls}>Employee Count</label>
              <select
                value={apolloEmployeeRange}
                onChange={(e) => setApolloEmployeeRange(e.target.value)}
                className={selectCls}
              >
                <option value="1,10" className={optionCls}>1-10 employees</option>
                <option value="1,20" className={optionCls}>1-20 employees</option>
                <option value="1,50" className={optionCls}>1-50 employees</option>
                <option value="11,50" className={optionCls}>11-50 employees</option>
                <option value="51,200" className={optionCls}>51-200 employees</option>
              </select>
            </div>
          </div>
        )}

        {/* Location */}
        <div>
          <label className={labelCls}>
            Target Location
            <span className="text-slate-600 normal-case font-normal tracking-normal ml-1">— United States</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* State filter */}
            <div>
              <select
                value={selectedState}
                onChange={(e) => onStateChange(e.target.value)}
                className={selectCls}
              >
                <option value="" className={optionCls}>All states</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code} className={optionCls}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* City picker */}
            <div className="md:col-span-2 relative">
              <input
                ref={inputRef}
                required
                value={cityInput}
                onChange={(e) => onCityInputChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder={selectedState ? `City in ${selectedState}…` : 'Type a city name…'}
                className={inputCls + (selectedCity ? ' !border-emerald-500/50' : '')}
                autoComplete="off"
              />
              {selectedCity && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 text-xs font-medium">✓</span>
              )}

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#1a1730] border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                  {suggestions.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => selectCity(c)}
                      className="w-full text-left px-3 py-2.5 text-sm text-slate-200 hover:bg-violet-600/20 hover:text-white transition-colors flex items-center gap-2.5"
                    >
                      <span className="text-[10px] font-semibold text-slate-500 bg-white/5 px-1.5 py-0.5 rounded flex-shrink-0">{c.state}</span>
                      {c.city}
                    </button>
                  ))}
                </div>
              )}

              {showSuggestions && cityInput.length >= 2 && suggestions.length === 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#1a1730] border border-white/10 rounded-lg shadow-xl px-3 py-2.5">
                  <p className="text-xs text-slate-500">No cities found{selectedState ? ` in ${selectedState}` : ''}. Try clearing the state filter.</p>
                </div>
              )}
            </div>
          </div>
          {!selectedCity && cityInput.length > 0 && (
            <p className="text-[10px] text-slate-600 mt-1.5">Select a city from the list to confirm.</p>
          )}
        </div>

        <div>
          <label className={labelCls}>
            Max Businesses to Contact
            <span className="text-slate-600 normal-case font-normal tracking-normal ml-1">— per run</span>
          </label>
          <select
            value={form.maxProspects}
            onChange={(e) => setForm({ ...form, maxProspects: e.target.value })}
            className={selectCls}
          >
            <option value="10" className={optionCls}>10 businesses</option>
            <option value="25" className={optionCls}>25 businesses</option>
            <option value="50" className={optionCls}>50 businesses</option>
            <option value="100" className={optionCls}>100 businesses</option>
            <option value="250" className={optionCls}>250 businesses</option>
            <option value="unlimited" className={optionCls}>Unlimited</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>
            Email Subject <span className="text-slate-600 normal-case font-normal tracking-normal">— use &#123;&#123;businessName&#125;&#125;</span>
          </label>
          <input
            required
            value={form.emailSubject}
            onChange={(e) => setForm({ ...form, emailSubject: e.target.value })}
            className={inputCls}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelCls + ' mb-0'}>
              {aiEnabled ? 'Fallback Email Body' : 'Email Body HTML'}
              {!aiEnabled && <span className="text-slate-600 normal-case font-normal tracking-normal ml-1">— &#123;&#123;businessName&#125;&#125;, &#123;&#123;city&#125;&#125;</span>}
            </label>
            {aiEnabled && (
              <button
                type="button"
                onClick={handleAiPreview}
                disabled={aiPreviewing}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-violet-300 bg-violet-500/10 border border-violet-500/25 rounded-lg hover:bg-violet-500/20 transition-colors disabled:opacity-50"
              >
                <svg className={`w-3 h-3 ${aiPreviewing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={aiPreviewing ? "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" : "M13 10V3L4 14h7v7l9-11h-7z"} />
                </svg>
                {aiPreviewing ? 'Generating…' : 'Preview AI Email'}
              </button>
            )}
          </div>
          <textarea
            required
            rows={aiEnabled ? 5 : 8}
            value={form.emailBodyHtml}
            onChange={(e) => setForm({ ...form, emailBodyHtml: e.target.value })}
            className={inputCls + ' font-mono resize-y' + (aiEnabled ? ' opacity-50' : '')}
            placeholder={aiEnabled ? 'Used as fallback if AI generation fails…' : ''}
          />
          {aiEnabled && (
            <p className="text-[10px] text-slate-600 mt-1">This template is only sent if Claude AI is unavailable.</p>
          )}
        </div>

        {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create Campaign'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-5 py-2.5 bg-white/5 text-slate-400 text-sm font-medium rounded-lg hover:bg-white/10 hover:text-white transition-colors border border-white/10"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* AI Preview Modal */}
      {aiPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAiPreviewOpen(false)} />
          <div className="relative bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <p className="text-sm font-semibold text-white">AI Email Preview</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Sample: &ldquo;{form.name || 'Acme Restaurant'}&rdquo; · {selectedCity?.city || 'New York'} · ★ 4.3</p>
              </div>
              <button onClick={() => setAiPreviewOpen(false)} className="text-slate-500 hover:text-white transition-colors text-lg">✕</button>
            </div>
            <div className="bg-white" style={{ minHeight: '300px' }}>
              {aiPreviewing ? (
                <div className="flex items-center justify-center h-48">
                  <div className="text-center text-slate-400 text-sm">Claude is writing a personalized email…</div>
                </div>
              ) : (
                <iframe
                  srcDoc={aiPreviewHtml}
                  className="w-full border-0"
                  style={{ height: '400px' }}
                  title="AI email preview"
                  sandbox="allow-same-origin"
                />
              )}
            </div>
            <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02]">
              <p className="text-[10px] text-slate-600">Each prospect gets a uniquely written version based on their actual data. This is just one example.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
