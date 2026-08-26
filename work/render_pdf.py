import os
import pypdfium2 as pdfium

source = r"outputs/ConfPresence_Hardware_Options_Report.pdf"
destination = r"work/pdfs"
document = pdfium.PdfDocument(source)
for index in range(len(document)):
    image = document[index].render(scale=2.0).to_pil()
    image.save(os.path.join(destination, f"confpresence-{index + 1}.png"))
print(len(document))
