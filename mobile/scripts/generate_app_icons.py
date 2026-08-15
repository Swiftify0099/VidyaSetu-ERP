import os
from PIL import Image, ImageDraw

def generate_icons():
    source_path = r'C:\Users\panka\.gemini\antigravity-ide\brain\aa9bd87c-3de5-4f43-95f2-940985f8423c\education_app_logo_1786673890777.jpg'
    img = Image.open(source_path).convert('RGBA')

    # Assets directories
    mobile_assets_dir = r'c:\Users\panka\OneDrive\Desktop\HMMV\mobile\src\assets'
    frontend_assets_dir = r'c:\Users\panka\OneDrive\Desktop\HMMV\frontend\public'
    res_dir = r'c:\Users\panka\OneDrive\Desktop\HMMV\mobile\android\app\src\main\res'

    os.makedirs(mobile_assets_dir, exist_ok=True)
    os.makedirs(frontend_assets_dir, exist_ok=True)

    # 1. Full logo with text
    full_logo = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    full_logo.save(os.path.join(mobile_assets_dir, 'logo_full.png'), 'PNG')
    full_logo.save(os.path.join(frontend_assets_dir, 'logo_full.png'), 'PNG')

    # 2. Extract Squircle App Icon (coordinates carefully measured)
    # The squircle is centered at (512, 462), width/height approx 640x640
    crop_box = (192, 142, 832, 782)
    icon = img.crop(crop_box)
    
    # Save standard high-res square icon
    icon_512 = icon.resize((512, 512), Image.Resampling.LANCZOS)
    icon_512.save(os.path.join(mobile_assets_dir, 'icon.png'), 'PNG')
    icon_512.save(os.path.join(mobile_assets_dir, 'logo.png'), 'PNG')
    icon_512.save(os.path.join(frontend_assets_dir, 'icon.png'), 'PNG')
    icon_512.save(os.path.join(frontend_assets_dir, 'favicon.ico'), 'ICO')

    # 3. Create high-res circular icon with anti-aliasing
    circle_size = 1024
    icon_large = icon.resize((circle_size, circle_size), Image.Resampling.LANCZOS)
    mask = Image.new('L', (circle_size, circle_size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, circle_size, circle_size), fill=255)
    
    round_icon = Image.new('RGBA', (circle_size, circle_size), (0, 0, 0, 0))
    round_icon.paste(icon_large, (0, 0), mask=mask)
    round_icon_512 = round_icon.resize((512, 512), Image.Resampling.LANCZOS)
    round_icon_512.save(os.path.join(mobile_assets_dir, 'icon_round.png'), 'PNG')

    # 4. Generate Android Mipmap dimensions
    mipmap_sizes = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192,
    }

    for folder, size in mipmap_sizes.items():
        target_folder = os.path.join(res_dir, folder)
        os.makedirs(target_folder, exist_ok=True)

        # Square launcher
        launcher_sq = icon.resize((size, size), Image.Resampling.LANCZOS)
        launcher_sq.save(os.path.join(target_folder, 'ic_launcher.png'), 'PNG')

        # Round launcher
        launcher_rd = round_icon.resize((size, size), Image.Resampling.LANCZOS)
        launcher_rd.save(os.path.join(target_folder, 'ic_launcher_round.png'), 'PNG')
        print(f"Generated {folder} ({size}x{size})")

    print("All icons successfully generated!")

if __name__ == '__main__':
    generate_icons()
