
from PIL import Image
import sys
import os

if __name__ == "__main__":
    icon_path = sys.argv[1]
    icon_dest_path = sys.argv[2]
    dir = os.path.dirname(__file__)
    mask = Image.open(os.path.join(dir, 'mask.png'))
    foreground = Image.open(os.path.join(dir, 'foreground.png'))
    icon_filled = Image.open(icon_path).resize(foreground.size)

    icon_processed = Image.new('RGBA', foreground.size, (255, 0, 0, 0))
    icon_resized = icon_filled.resize((824, 824))
    padding = (foreground.size[0] - 824) // 2
    icon_processed.paste(icon_resized, box=(padding, padding))

    im = Image.composite(icon_processed, foreground, mask)
    im.save(icon_dest_path, 'png')