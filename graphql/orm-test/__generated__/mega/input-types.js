"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectionFieldsMap = void 0;
// ============ Connection Fields Map ============
exports.connectionFieldsMap = {
    "Location": {
        "amenities": "Amenity",
        "tags": "Tag",
        "locationAmenities": "LocationAmenity"
    },
    "Amenity": {
        "locations": "Location",
        "locationAmenities": "LocationAmenity"
    },
    "Category": {
        "locations": "Location"
    }
};
