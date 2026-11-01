# Free 3D VRM Models for Saathi

Saathi comes out of the box with an expressive **procedural 3D human avatar engine** and **calming glowing orb**. You can also optionally drop standard CC0 / free `.vrm` 3D humanoid models directly into this folder!

## Step-by-Step: Where to Download Free VRM Models

### 1. VRoid Hub (Official Free Models, CC0 & Permissive Licenses)
- **URL**: [https://hub.vroid.com/](https://hub.vroid.com/)
- Filter by: **"Free to use"** and **"Commercial / Non-Commercial OK"**.
- Many creators provide diverse, high-quality CC0 humanoid characters in standard `.vrm` format under 5 MB.

### 2. GitHub Open Source VRM Repositories (Free & Open Source)
- **Alicia Solid VRM** (Standard testing VRM by DWANGO):
  - [https://github.com/vrm-c/UniVRM/tree/master/Tests/Models/Alicia_vrm-0.51](https://github.com/vrm-c/UniVRM/tree/master/Tests/Models/Alicia_vrm-0.51)
- **Pixiv three-vrm sample models**:
  - [https://github.com/pixiv/three-vrm/tree/master/packages/three-vrm/examples/models](https://github.com/pixiv/three-vrm/tree/master/packages/three-vrm/examples/models)
- **VRoid Studio (Free Desktop App to export custom VRM)**:
  - [https://vroid.com/en/studio](https://vroid.com/en/studio) - 100% free software to export any gender, age, hairstyle, skin tone, and clothing directly to a `.vrm` file.

### 3. File Names & Placement

Rename your downloaded `.vrm` models and place them right in this directory (`/public/avatars/`):

- `/public/avatars/avatar-1.vrm` -> **Aarav** (Young Adult Male, Warm Olive skin)
- `/public/avatars/avatar-2.vrm` -> **Priya** (Adult Female, Deep Caramel skin)
- `/public/avatars/avatar-3.vrm` -> **Kavita** (Senior Female, Wheatish skin, Glasses)
- `/public/avatars/avatar-4.vrm` -> **Dev** (Senior Male, Wheatish skin, Kind eyes)
- `/public/avatars/avatar-5.vrm` -> **Rohan** (Young Adult Male, Dusky skin)
- `/public/avatars/avatar-6.vrm` -> **Meera** (Young Adult Female, Warm Peach skin)

When any of these files are present, Saathi's `@pixiv/three-vrm` engine automatically loads the `.vrm` model and animates its blendshapes (`aa`, `ih`, `ou`, `ee`, `oh`, `blink`, `happy`, `sad`) and bone rotations. When no `.vrm` file is present, Saathi smoothly uses the built-in procedural 3D human model with zero errors or 404 dependencies!
