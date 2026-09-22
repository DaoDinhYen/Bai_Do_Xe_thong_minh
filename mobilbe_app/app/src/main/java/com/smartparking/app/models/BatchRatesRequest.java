package com.smartparking.app.models;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class BatchRatesRequest {
    @SerializedName("rates")
    private List<ParkingRate> rates;

    public BatchRatesRequest(List<ParkingRate> rates) {
        this.rates = rates;
    }

    public List<ParkingRate> getRates() {
        return rates;
    }

    public void setRates(List<ParkingRate> rates) {
        this.rates = rates;
    }
}
