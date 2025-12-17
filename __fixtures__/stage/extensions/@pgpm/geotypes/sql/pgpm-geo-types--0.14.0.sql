\echo Use "CREATE EXTENSION pgpm-geo-types" to load this file. \quit
CREATE DOMAIN geolocation AS geometry(point, 4326);

COMMENT ON DOMAIN geolocation IS '@name pgpmInternalTypeGeoLocation';

CREATE DOMAIN geopolygon AS geometry(polygon, 4326);

COMMENT ON DOMAIN geopolygon IS '@name pgpmInternalTypeGeoPolygon';