from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.vehicle import Vehicle
from app.models.emission_factor import EmissionFactor
from app.emissions.calculator import (
    calculate_load_ratio,
    calculate_load_multiplier,
    calculate_congestion_multiplier,
    calculate_fuel_consumption,
    calculate_co2_emissions,
    compare_scenarios,
)
from app.emissions.schemas import (
    EmissionEstimateRequest,
    EmissionEstimateResponse,
    ScenarioInput,
    EmissionCompareRequest,
    EmissionCompareResponse,
)

class EmissionService:
    def __init__(self, db: Session):
        self.db = db

    def estimate_emissions_for_vehicle(self, req: EmissionEstimateRequest) -> EmissionEstimateResponse:
        # 1. Fetch Vehicle from Database
        vehicle = self.db.query(Vehicle).filter(Vehicle.id == req.vehicle_id).first()
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vehicle with ID '{req.vehicle_id}' not found"
            )

        fuel_type_str = str(vehicle.fuel_type).upper()

        # 2. Fetch EmissionFactor from Database for vehicle's fuel_type
        factor_record = self.db.query(EmissionFactor).filter(
            EmissionFactor.fuel_type == fuel_type_str
        ).first()

        if not factor_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No emission factor configured in database for fuel type '{fuel_type_str}'"
            )

        # 3. Perform Emission Calculations
        load_ratio = calculate_load_ratio(req.load_kg, vehicle.capacity_kg)
        load_mult = calculate_load_multiplier(load_ratio)
        congestion_mult = calculate_congestion_multiplier(req.congestion_index)
        
        base_fuel = round(req.distance_km / vehicle.fuel_efficiency_km_per_l, 4) if vehicle.fuel_efficiency_km_per_l > 0 else 0.0
        total_fuel = calculate_fuel_consumption(
            req.distance_km,
            vehicle.fuel_efficiency_km_per_l,
            load_mult,
            congestion_mult
        )
        total_co2 = calculate_co2_emissions(total_fuel, factor_record.kg_co2_per_unit)

        message = None
        if fuel_type_str == "ELECTRIC":
            message = "Extensible kWh calculation: Electric Vehicle energy consumption calculated in kWh and grid emission factor."

        return EmissionEstimateResponse(
            vehicle_id=vehicle.id,
            distance_km=req.distance_km,
            load_kg=req.load_kg,
            capacity_kg=vehicle.capacity_kg,
            load_ratio=round(load_ratio, 4),
            fuel_type=fuel_type_str,
            base_fuel_l=base_fuel,
            load_multiplier=load_mult,
            congestion_multiplier=congestion_mult,
            estimated_fuel_l=total_fuel,
            emission_factor_kg_co2_per_l=factor_record.kg_co2_per_unit,
            unit=factor_record.unit,
            estimated_co2_kg=total_co2,
            message=message
        )

    def compare_emissions_scenarios(self, req: EmissionCompareRequest) -> EmissionCompareResponse:
        # Estimate baseline scenario
        baseline_req = EmissionEstimateRequest(
            vehicle_id=req.vehicle_id,
            distance_km=req.baseline.distance_km,
            load_kg=req.baseline.load_kg,
            congestion_index=req.baseline.congestion_index
        )
        baseline_res = self.estimate_emissions_for_vehicle(baseline_req)

        # Estimate optimized scenario
        optimized_req = EmissionEstimateRequest(
            vehicle_id=req.vehicle_id,
            distance_km=req.optimized.distance_km,
            load_kg=req.optimized.load_kg,
            congestion_index=req.optimized.congestion_index
        )
        optimized_res = self.estimate_emissions_for_vehicle(optimized_req)

        # Compare baseline vs optimized
        comp = compare_scenarios(
            baseline_res.estimated_fuel_l,
            baseline_res.estimated_co2_kg,
            optimized_res.estimated_fuel_l,
            optimized_res.estimated_co2_kg
        )

        return EmissionCompareResponse(
            vehicle_id=req.vehicle_id,
            baseline=baseline_res,
            optimized=optimized_res,
            fuel_saved_l=comp["fuel_saved_l"],
            co2_saved_kg=comp["co2_saved_kg"],
            co2_reduction_percentage=comp["co2_reduction_percentage"]
        )
