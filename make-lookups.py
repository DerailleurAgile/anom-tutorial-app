import pandas as pd
import json

file_path = "scaling-factors.xlsx"
excel_file = pd.ExcelFile(file_path)

constants_catalog = {
    "ANOM": {},
    "ANOR": {}
}

# Standard explicit targets
sheet_mapping = {
    "anom-10": ("ANOM", "0.10"),
    "anom-5":  ("ANOM", "0.05"),
    "anom-1":  ("ANOM", "0.01"),
    "anor-10": ("ANOR", "0.10"),
    "anor-5":  ("ANOR", "0.05"),
    "anor-1":  ("ANOR", "0.01")
}

# Clean sheet lookup index to defend against invisible whitespace
normalized_sheets = {name.strip().lower().replace('_', '-'): name for name in excel_file.sheet_names}

for target_name, (chart_type, alpha) in sheet_mapping.items():
    # Defensive alignment checks
    lookup_key = target_name.lower()
    alt_lookup_key = target_name.replace("-", "").lower() # catches 'anor10'
    
    actual_sheet_name = normalized_sheets.get(lookup_key) or normalized_sheets.get(alt_lookup_key)
    
    if actual_sheet_name:
        print(f"Processing Sheet: '{actual_sheet_name}' -> Target: {chart_type} ({alpha})")
        df = pd.read_excel(file_path, sheet_name=actual_sheet_name)
        
        # Enforce treating index 0 explicitly as row headers
        df.set_index(df.columns[0], inplace=True)
        
        if alpha not in constants_catalog[chart_type]:
            constants_catalog[chart_type][alpha] = {}
            
        row_count = 0
        for k_val in df.index:
            if pd.isna(k_val):
                continue
            
            # Clean string conversions if index is stored as text vs raw int
            k_str = str(k_val).strip().split('.')[0] 
            if not k_str.isdigit():
                continue
                
            m_key = f"m{k_str}"
            constants_catalog[chart_type][alpha][m_key] = {}
            row_count += 1
            
            for col in df.columns:
                n_key = "".join(filter(str.isdigit, str(col)))
                if n_key:
                    val = df.loc[k_val, col]
                    if pd.notna(val):
                        constants_catalog[chart_type][alpha][m_key][n_key] = float(val)
                        
        print(f"   Successfully compiled {row_count} data matrices for {target_name}.")
    else:
        print(f"❌ CRITICAL ERROR: Could not locate tab structure for '{target_name}' in workbook.")
        print(f"   Available sheets found: {excel_file.sheet_names}")

# Regenerate catalog file
output_filename = "anom_anor_constants.json"
with open(output_filename, 'w') as f:
    json.dump(constants_catalog, f, indent=2)

print(f"\nMatrix rebuild complete! Saved file to: {output_filename}")