# Configurable weight parameters for the EcoLogix Emission Model

# Fully loaded vehicle consumes approximately 20% more fuel than unloaded baseline
LOAD_FACTOR_WEIGHT = 0.20

# Maximum congestion (1.0) increases fuel consumption by 30%
CONGESTION_FACTOR_WEIGHT = 0.30

# Fallback default emission factor if missing in database
DEFAULT_DIESEL_EMISSION_FACTOR = 2.68  # kg CO2 per litre
DEFAULT_PETROL_EMISSION_FACTOR = 2.31  # kg CO2 per litre
DEFAULT_ELECTRIC_EMISSION_FACTOR = 0.82 # kg CO2 per kWh (grid)
