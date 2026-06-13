import pandas as pd
import json

# Path to your Dr. Wheeler constants workbook
file_path = "scaling-factors.xlsx"
excel_file = pd.ExcelFile(file_path)

# Initialize a unified catalog structure for both chart types
constants_catalog = {
    "ANOM": {},
    "ANOR": {}
}

# Mapping exact Excel tab configurations to target structures
sheet_mapping = {
    "anom-10": ("ANOM", "0.10"),
    "anom-5":  ("ANOM", "0.05"),
    "anom-1":  ("ANOM", "0.01"),
    "anor-10": ("ANOR", "0.10"),
    "anor-5":  ("ANOR", "0.05"),
    "anor-1":  ("ANOR", "0.01")
}

for sheet_name, (chart_type, alpha) in sheet_mapping.items():
    if sheet_name in excel_file.sheet_names:
        # Read sheet, using the first column (k/m groups) as the row index
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        
        # Ensure the row label column (k or m) is treated as the matrix index
        df.set_index(df.columns[0], inplace=True)
        
        # Initialize alpha level bucket if it doesn't exist yet
        if alpha not in constants_catalog[chart_type]:
            constants_catalog[chart_type][alpha] = {}
            
        for k_val in df.index:
            # Skip empty or text summary rows if any exist in the spreadsheet margins
            if pd.isna(k_val) or not str(k_val).strip().isdigit():
                continue
                
            m_key = f"m{int(k_val)}"
            constants_catalog[chart_type][alpha][m_key] = {}
            
            for col in df.columns:
                # Strip text prefixes from column headers (e.g., 'n4' or ' n = 4 ' -> '4')
                n_key = "".join(filter(str.isdigit, str(col)))
                
                if n_key:
                    val = df.loc[k_val, col]
                    if pd.notna(val):
                        constants_catalog[chart_type][alpha][m_key][n_key] = float(val)
    else:
        print(f"Warning: Expected sheet '{sheet_name}' was not discovered in the workbook.")

# Output the catalog as a pristine JSON module ready for copy-pasting into script.js
output_filename = "anom_anor_constants.json"
with open(output_filename, 'w') as f:
    json.dump(constants_catalog, f, indent=2)

print(f"Success! Exact constants successfully compiled and saved to {output_filename}")