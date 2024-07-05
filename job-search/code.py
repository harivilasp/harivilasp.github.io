search_engines = [
    "53b1e17e3832c48f6",
    "5518556cadc4a4ca2",
    "11958af140029492b",
    "25ca0e303374d4430",
    "54e231facd5a74fe5",
    "b5f50f37d081246b8",
    "10ee059ac23e245e0",
    "07d7874a7a1ee4fa8",
    "e7e36d4c4486e40e7",
    "486a10a40818e713e",
    "c542f59f33f600c9f",
    "b71d38a34513647cc",
    "ed9a8a5d288987e93",
    "d6d4a6da4317f4f2c",
    "e6531aa07d1f643f9"
]

html_template = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script async src="https://cse.google.com/cse.js?cx={cx}"></script>
</head>
<body>
  <div class="gcse-search"></div>
</body>
</html>
"""

for i, cx in enumerate(search_engines, start=1):
    file_name = f"search{i}.html"
    with open(file_name, "w") as file:
        file.write(html_template.format(cx=cx))
    print(f"Generated {file_name}")
