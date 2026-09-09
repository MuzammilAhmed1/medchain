package com.medchain.geo;

import java.util.ArrayList;
import java.util.List;

public final class PolylineUtils {

    private PolylineUtils() {}

    public record LatLng(double latitude, double longitude) {}

    /**
     * Decodes a Google Encoded Polyline into a list of LatLng coordinates.
     */
    public static List<LatLng> decode(String encoded) {
        List<LatLng> poly = new ArrayList<>();
        if (encoded == null || encoded.isBlank()) {
            return poly;
        }

        int index = 0;
        int len = encoded.length();
        int lat = 0;
        int lng = 0;

        while (index < len) {
            int b;
            int shift = 0;
            int result = 0;
            do {
                b = encoded.charAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            poly.add(new LatLng(lat / 1e5, lng / 1e5));
        }

        return poly;
    }

    /**
     * Encodes a simple list of LatLng coordinates into a Google Polyline string.
     */
    public static String encode(List<LatLng> points) {
        if (points == null || points.isEmpty()) return "";
        StringBuilder encoded = new StringBuilder();
        int prevLat = 0;
        int prevLng = 0;

        for (LatLng p : points) {
            int lat = (int) Math.round(p.latitude() * 1e5);
            int lng = (int) Math.round(p.longitude() * 1e5);

            encodeValue(lat - prevLat, encoded);
            encodeValue(lng - prevLng, encoded);

            prevLat = lat;
            prevLng = lng;
        }
        return encoded.toString();
    }

    private static void encodeValue(int val, StringBuilder result) {
        val = val < 0 ? ~(val << 1) : (val << 1);
        while (val >= 0x20) {
            result.append((char) ((0x20 | (val & 0x1f)) + 63));
            val >>= 5;
        }
        result.append((char) (val + 63));
    }

    /**
     * Calculates distance between point (pLat, pLng) and a route polyline in meters.
     */
    public static double minDistanceToPolylineMeters(double pLat, double pLng, List<LatLng> polyline) {
        if (polyline == null || polyline.isEmpty()) return Double.MAX_VALUE;
        double minDistance = Double.MAX_VALUE;
        for (LatLng node : polyline) {
            double d = haversineMeters(pLat, pLng, node.latitude(), node.longitude());
            if (d < minDistance) {
                minDistance = d;
            }
        }
        return minDistance;
    }

    /**
     * Haversine formula to compute great-circle distance between two points in meters.
     */
    public static double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371000; // Earth radius in meters
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
