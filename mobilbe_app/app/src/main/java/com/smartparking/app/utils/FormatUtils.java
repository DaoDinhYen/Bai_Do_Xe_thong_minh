package com.smartparking.app.utils;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class FormatUtils {

    public static String formatCurrency(double amount) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(new Locale("vi", "VN"));
        symbols.setGroupingSeparator('.');
        symbols.setDecimalSeparator(',');
        DecimalFormat formatter = new DecimalFormat("#,###", symbols);
        return formatter.format(amount) + " VNĐ";
    }

    public static String formatCurrencyWithSign(double amount, boolean isPositive) {
        String base = formatCurrency(Math.abs(amount));
        if (isPositive) {
            return "+" + base;
        } else {
            return "-" + base;
        }
    }

    public static String formatDateTime(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return "";
        try {
            Date date = parseIso(dateStr);
            SimpleDateFormat outFormat = new SimpleDateFormat("dd/MM/yyyy · HH:mm", Locale.getDefault());
            return outFormat.format(date);
        } catch (Exception e) {
            return dateStr;
        }
    }

    public static String formatDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return "";
        try {
            Date date = parseIso(dateStr);
            SimpleDateFormat outFormat = new SimpleDateFormat("dd/MM/yyyy", Locale.getDefault());
            return outFormat.format(date);
        } catch (Exception e) {
            return dateStr;
        }
    }

    public static String formatTime(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return "";
        try {
            Date date = parseIso(dateStr);
            SimpleDateFormat outFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());
            return outFormat.format(date);
        } catch (Exception e) {
            return dateStr;
        }
    }

    private static Date parseIso(String str) {
        // Try multiple formats
        String[] formats = {
                "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                "yyyy-MM-dd'T'HH:mm:ss'Z'",
                "yyyy-MM-dd'T'HH:mm:ss",
                "yyyy-MM-dd HH:mm:ss",
                "yyyy-MM-dd"
        };
        for (String f : formats) {
            try {
                SimpleDateFormat sdf = new SimpleDateFormat(f, Locale.getDefault());
                if (f.endsWith("'Z'")) {
                    sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
                }
                return sdf.parse(str);
            } catch (Exception ignored) {}
        }
        return new Date();
    }
}
