# Proguard rules for SmartParkingApp
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepattributes *Annotation*
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
