# Menu & Customization System

Documentation of menu item creation, customizations, allergens, appliances, and categories.

---

## Table of Contents

1. [Overview](#overview)
2. [Menu Items](#menu-items)
3. [Customizations](#customizations)
4. [Categories](#categories)
5. [Allergens](#allergens)
6. [Appliances](#appliances)
7. [AI Features](#ai-features)
8. [Go Live Toggle](#go-live-toggle)

---

## Overview

The menu system allows chefs to create and manage dishes with:
- Detailed descriptions
- Pricing
- Categories (cuisines)
- Allergen information
- Required appliances
- Customization options (add-ons)

**Related Files:**
- Model: `backend/app/Models/Menus.php`
- Model: `backend/app/Models/Customizations.php`
- Frontend: `frontend/app/screens/chef/addMenuItem/`
- Frontend: `frontend/app/screens/chef/menu/`

---

## Menu Items

### Data Structure

```typescript
interface IMenu {
  id?: number;
  user_id: number;           // Chef ID
  title: string;             // Dish name
  description: string;       // Dish description
  price: number;             // Price in dollars
  serving_size: string;      // e.g., "Serves 2"
  meals: string;             // Meal types (comma-separated)
  category_ids: string;      // Category IDs (comma-separated)
  allergens: string;         // Allergen IDs (comma-separated)
  appliances: string;        // Appliance IDs (comma-separated)
  estimated_time: number;    // Prep time in minutes
  photo?: string;            // Photo URL
  is_live: number;           // 1 = visible, 0 = hidden
  customizations?: IMenuCustomization[];

  // AI tracking
  ai_generated_description?: number;
  description_edited?: number;
}
```

### Database Schema

```sql
CREATE TABLE tbl_menus (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    serving_size VARCHAR(100),
    meals VARCHAR(255),
    category_ids VARCHAR(255),
    allergens VARCHAR(255),
    appliances VARCHAR(255),
    estimated_time INT,
    photo VARCHAR(255),
    is_live TINYINT DEFAULT 0,
    ai_generated_description TINYINT DEFAULT 0,
    description_edited TINYINT DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,

    INDEX idx_menus_chef (user_id),
    INDEX idx_menus_live (is_live)
);
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/get_menus` | GET | Get all menus |
| `/get_menu/{id}` | GET | Get single menu |
| `/get_chef_menus?user_id={id}` | GET | Get chef's menus |
| `/create_menu` | POST | Create menu item |
| `/update_menu/{id}` | POST | Update menu item |
| `/remove_menu/{id}` | POST | Delete menu item |

### Create Menu

```php
// MapiController@createMenu
public function createMenu(Request $request)
{
    $menu = new Menus();
    $menu->user_id = $request->user_id;
    $menu->title = $request->title;
    $menu->description = $request->description;
    $menu->price = $request->price;
    $menu->serving_size = $request->serving_size;
    $menu->meals = $request->meals;
    $menu->category_ids = $request->category_ids;
    $menu->allergens = $request->allergens;
    $menu->appliances = $request->appliances;
    $menu->estimated_time = $request->estimated_time;
    $menu->photo = $request->photo;
    $menu->is_live = $request->is_live ?? 0;
    $menu->save();

    return response()->json([
        'success' => true,
        'data' => $menu,
    ]);
}
```

---

## Customizations

Customizations allow customers to modify menu items (add-ons, spice level, etc.).

### Data Structure

```typescript
interface IMenuCustomization {
  id?: number;
  menu_id: number;
  name: string;           // Group name (e.g., "Spice Level")
  options: ICustomizationOption[];
  is_required: boolean;
}

interface ICustomizationOption {
  name: string;           // Option name (e.g., "Extra Spicy")
  price: number;          // Additional price
}
```

### Database Schema

```sql
CREATE TABLE tbl_customizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    options JSON,
    is_required TINYINT DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,

    INDEX idx_customizations_menu (menu_id)
);
```

### Options JSON Structure

```json
{
  "options": [
    { "name": "Mild", "price": 0 },
    { "name": "Medium", "price": 0 },
    { "name": "Spicy", "price": 0 },
    { "name": "Extra Spicy", "price": 1.50 }
  ]
}
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/get_customizations` | GET | Get all customizations |
| `/get_customization/{id}` | GET | Get single customization |
| `/get_customizations_by_menu_id?menu_id={id}` | GET | Get menu's customizations |
| `/create_customization` | POST | Create customization |
| `/update_customization/{id}` | POST | Update customization |
| `/remove_customization/{id}` | POST | Delete customization |

### Frontend: Add Customization

**Screen:** `frontend/app/screens/chef/addOnCustomization/`

```typescript
const [customization, setCustomization] = useState({
  menu_id: menuId,
  name: '',
  options: [{ name: '', price: 0 }],
  is_required: false,
});

const handleAddOption = () => {
  setCustomization({
    ...customization,
    options: [...customization.options, { name: '', price: 0 }],
  });
};

const handleSave = async () => {
  const resp = await CreateCustomizationAPI(customization);
  if (resp.success) {
    goBack();
  }
};
```

### Order Addons Format

When customer orders with customizations:

```json
{
  "addons": [
    {
      "customization_id": 1,
      "customization_name": "Spice Level",
      "selected_option": "Extra Spicy",
      "price": 1.50
    },
    {
      "customization_id": 2,
      "customization_name": "Add Extra",
      "selected_option": "Extra Cheese",
      "price": 2.00
    }
  ]
}
```

---

## Categories

Cuisine categories for organizing and filtering menus.

### Data Structure

```typescript
interface ICategory {
  id: number;
  name: string;
  status: number;  // 1 = inactive, 2 = active
}
```

### Common Categories

- Italian
- Mexican
- Asian
- American
- Mediterranean
- Indian
- Thai
- Japanese
- Caribbean
- Soul Food

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/get_categories` | GET | Get active categories |
| `/create_category` | POST | Create category |

### Category Selection (Frontend)

```typescript
// Multiple categories can be selected
const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

const toggleCategory = (categoryId: number) => {
  if (selectedCategories.includes(categoryId)) {
    setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
  } else {
    setSelectedCategories([...selectedCategories, categoryId]);
  }
};

// Save as comma-separated string
const category_ids = selectedCategories.join(',');
```

---

## Allergens

Allergen information for food safety.

### Common Allergens

| ID | Name |
|----|------|
| 1 | Milk |
| 2 | Eggs |
| 3 | Fish |
| 4 | Shellfish |
| 5 | Tree Nuts |
| 6 | Peanuts |
| 7 | Wheat |
| 8 | Soybeans |
| 9 | Sesame |

### Data Structure

```typescript
interface IAllergen {
  id: number;
  name: string;
  status: number;  // 1 = inactive, 2 = active
}
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/get_allergens` | GET | Get active allergens |

### Allergen Selection

```typescript
// Displayed as chips with toggle
const AllergenSelector = ({ allergens, selected, onToggle }) => (
  <View style={styles.allergenGrid}>
    {allergens.map(allergen => (
      <Chip
        key={allergen.id}
        label={allergen.name}
        selected={selected.includes(allergen.id)}
        onPress={() => onToggle(allergen.id)}
      />
    ))}
  </View>
);
```

---

## Appliances

Kitchen appliances required to prepare the dish.

### Common Appliances

| ID | Name |
|----|------|
| 1 | Oven |
| 2 | Stovetop |
| 3 | Microwave |
| 4 | Blender |
| 5 | Air Fryer |
| 6 | Grill |

### Purpose

Customers may need certain appliances available. Appliance requirements help set expectations.

### Frontend Constants

**File:** `frontend/constants/appliances.ts`

```typescript
export const APPLIANCES = [
  { id: 1, name: 'Oven', icon: 'oven' },
  { id: 2, name: 'Stovetop', icon: 'fire' },
  { id: 3, name: 'Microwave', icon: 'microwave' },
  { id: 4, name: 'Blender', icon: 'blender' },
  { id: 5, name: 'Air Fryer', icon: 'air-fryer' },
  { id: 6, name: 'Grill', icon: 'grill' },
];
```

---

## AI Features

### Generate Description

AI generates a description from just the dish name.

```typescript
// Frontend
const handleGenerate = async () => {
  const resp = await GenerateMenuDescriptionAPI({ dish_name: title });
  if (resp.success) {
    setDescription(resp.data.description);
  }
};
```

```php
// Backend - MapiController@generateMenuDescription
public function generateMenuDescription(Request $request)
{
    $openai = new OpenAIService();

    $prompt = "Write a short, appetizing description for a dish called '{$request->dish_name}'.
               Keep it under 100 words and focus on flavors and presentation.";

    $description = $openai->chat($prompt);

    return response()->json([
        'success' => true,
        'data' => ['description' => $description],
    ]);
}
```

### Enhance Description

AI improves an existing description.

```typescript
const handleEnhance = async () => {
  const resp = await EnhanceMenuDescriptionAPI({ description });
  if (resp.success) {
    setDescription(resp.data.description);
  }
};
```

### Analyze Metadata

AI suggests categories and allergens based on dish name and description.

```typescript
const handleAnalyze = async () => {
  const resp = await AnalyzeMenuMetadataAPI({
    dish_name: title,
    description: description,
  });

  if (resp.success) {
    setSuggestedCategories(resp.data.categories);
    setSuggestedAllergens(resp.data.allergens);
  }
};
```

---

## Go Live Toggle

Menus can be toggled between live (visible) and hidden.

### Toggle Component

**File:** `frontend/app/components/GoLiveToggle.tsx`

```typescript
const GoLiveToggle = ({ menuId, isLive, onToggle }) => {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const resp = await UpdateMenuAPI({
      id: menuId,
      is_live: isLive ? 0 : 1,
    });

    if (resp.success) {
      onToggle(!isLive);
    }
    setLoading(false);
  };

  return (
    <Switch
      value={isLive}
      onValueChange={handleToggle}
      disabled={loading}
      trackColor={{ true: AppColors.primary }}
    />
  );
};
```

### Requirements for Going Live

1. Menu must have:
   - Title
   - Description
   - Price
   - At least one category

2. Chef must be:
   - Approved (is_pending = 0)
   - Have completed profile

---

## Menu Creation Flow

### Step-by-Step Wizard

**Directory:** `frontend/app/screens/chef/addMenuItem/`

1. **StepMenuItemName** - Enter dish name
2. **StepMenuItemDescription** - Enter/generate description
3. **StepMenuItemCategories** - Select categories
4. **StepMenuItemAllergens** - Mark allergens
5. **StepMenuItemKitchen** - Select appliances
6. **StepMenuItemPricing** - Set price and serving size
7. **StepMenuItemCustomizations** - Add customization options
8. **StepMenuItemReview** - Review and save

### State Management

```typescript
const [menuData, setMenuData] = useState<IMenu>({
  user_id: user.id,
  title: '',
  description: '',
  price: 0,
  serving_size: '',
  meals: '',
  category_ids: '',
  allergens: '',
  appliances: '',
  estimated_time: 30,
  is_live: 0,
});

const updateMenuData = (field: string, value: any) => {
  setMenuData({ ...menuData, [field]: value });
};
```

### Final Save

```typescript
const handleSave = async () => {
  dispatch(showLoading());

  const resp = editMode
    ? await UpdateMenuAPI(menuData)
    : await CreateMenuAPI(menuData);

  dispatch(hideLoading());

  if (resp.success) {
    ShowSuccessToast('Menu item saved!');
    navigate.toChef.menu();
  } else {
    ShowErrorToast(resp.error || 'Failed to save');
  }
};
```
