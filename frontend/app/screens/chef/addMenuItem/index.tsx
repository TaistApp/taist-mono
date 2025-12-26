import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native';

// Types & Services
import { IMenu } from '../../../types/index';

// Hooks
import { useAppDispatch, useAppSelector } from '../../../hooks/useRedux';

import { goBack, navigate } from '@/app/utils/navigation';
import { useLocalSearchParams } from 'expo-router';
import Container from '../../../layout/Container';
import { hideLoading, showLoading } from '../../../reducers/loadingSlice';
import {
  CreateCategoryAPI,
  CreateMenuAPI,
  UpdateMenuAPI,
  AnalyzeMenuMetadataAPI
} from '../../../services/api';
import { ShowErrorToast, ShowSuccessToast } from '../../../utils/toast';
import { styles } from './styles';

// Step Components
import { StepMenuItemName } from './steps/StepMenuItemName';
import { StepMenuItemDescription } from './steps/StepMenuItemDescription';
import { StepMenuItemCategories } from './steps/StepMenuItemCategories';
import { StepMenuItemAllergens } from './steps/StepMenuItemAllergens';
import { StepMenuItemKitchen } from './steps/StepMenuItemKitchen';
import { StepMenuItemPricing } from './steps/StepMenuItemPricing';
import { StepMenuItemCustomizations } from './steps/StepMenuItemCustomizations';
import { StepMenuItemReview } from './steps/StepMenuItemReview';

const AddMenuItem = () => {
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();

  // Get user and menu state for onboarding detection
  const self = useAppSelector(x => x.user.user);
  const menus = useAppSelector(x => x.table.menus);

  // Parse existing menu item info for edit mode
  const info: IMenu | undefined = typeof params?.info === 'string'
    ? JSON.parse(params.info as string)
    : (params?.info as IMenu | undefined);

  // Multi-step state
  const [step, setStep] = useState(1);
  const [menuItemData, setMenuItemData] = useState<Partial<IMenu>>({});

  // Initialize data from existing menu item (edit mode)
  useEffect(() => {
    if (info) {
      // Parse category IDs
      const categoryIds = (info.category_ids ?? '')
        .toString()
        .split(',')
        .map(x => parseInt(x))
        .filter(x => !isNaN(x));

      // Parse appliance IDs
      const applianceIds = (info.appliances ?? '')
        .toString()
        .split(',')
        .map(x => parseInt(x))
        .filter(x => !isNaN(x));

      // Parse allergen IDs
      const allergyIds = (info.allergens ?? '')
        .toString()
        .split(',')
        .map(x => parseInt(x))
        .filter(x => !isNaN(x));

      // Find completion time ID from minutes
      const completionTimes = [
        { id: '1', value: '2 hr +', m: 120 },
        { id: '2', value: '1.5 hr', m: 90 },
        { id: '3', value: '1 hr', m: 60 },
        { id: '4', value: '45 m', m: 45 },
        { id: '5', value: '30 m', m: 30 },
        { id: '6', value: '15 m', m: 15 },
      ];
      const completionTimeId = completionTimes.find(
        x => x.m === info.estimated_time
      )?.id ?? '1';

      setMenuItemData({
        id: info.id,
        title: info.title ?? '',
        description: info.description ?? '',
        category_ids: categoryIds as any,
        appliances: applianceIds as any,
        allergens: allergyIds as any,
        completion_time_id: completionTimeId,
        estimated_time: info.estimated_time,
        serving_size: info.serving_size ?? 1,
        price: info.price,
        price_string: info.price ? info.price.toFixed(2) : '',
        is_live: info.is_live ?? 1,
        customizations: info.customizations ?? [],
        is_new_category: false,
        new_category_name: '',
      });
    }
  }, []);

  // Update menu item data
  const handleUpdateMenuItemData = (updates: Partial<IMenu>) => {
    setMenuItemData({ ...menuItemData, ...updates });
  };

  // Auto-populate metadata using AI analysis
  const analyzeAndPopulateMetadata = async (overrideDescription?: string) => {
    const description = overrideDescription ?? menuItemData.description;
    if (!menuItemData.title || !description) return;

    try {
      const response = await AnalyzeMenuMetadataAPI({
        dish_name: menuItemData.title,
        description: description
      });

      if (response.success === 1 && response.metadata) {
        const updates: Partial<IMenu> = {};

        // Only update if user hasn't manually set these
        if (!menuItemData.estimated_time && response.metadata.estimated_time) {
          updates.estimated_time = response.metadata.estimated_time;

          // Also set completion_time_id for UI
          const completionTimes = [
            { id: '6', m: 15 },
            { id: '5', m: 30 },
            { id: '4', m: 45 },
            { id: '3', m: 60 },
            { id: '2', m: 90 },
            { id: '1', m: 120 },
          ];
          const match = completionTimes.find(ct => ct.m === response.metadata.estimated_time);
          if (match) updates.completion_time_id = match.id;
        }

        if ((!menuItemData.appliances || (Array.isArray(menuItemData.appliances) && menuItemData.appliances.length === 0)) && response.metadata.appliance_ids?.length) {
          updates.appliances = response.metadata.appliance_ids as any;
        }

        if ((!menuItemData.allergens || (Array.isArray(menuItemData.allergens) && menuItemData.allergens.length === 0)) && response.metadata.allergen_ids?.length) {
          updates.allergens = response.metadata.allergen_ids as any;
        }

        if ((!menuItemData.category_ids || (Array.isArray(menuItemData.category_ids) && menuItemData.category_ids.length === 0)) && response.metadata.category_ids?.length) {
          updates.category_ids = response.metadata.category_ids as any;
        }

        if (Object.keys(updates).length > 0) {
          handleUpdateMenuItemData(updates);
        }
      }
    } catch (error) {
      console.log('Metadata analysis failed, skipping', error);
    }
  };

  // Complete menu item creation/update
  const handleCompleteMenuItem = async () => {
    dispatch(showLoading());

    try {
      // Handle new category creation if requested
      let category_id_list = Array.isArray(menuItemData.category_ids)
        ? [...menuItemData.category_ids]
        : typeof menuItemData.category_ids === 'string'
        ? menuItemData.category_ids.split(',').map(x => parseInt(x)).filter(x => !isNaN(x))
        : [];

      if (menuItemData.is_new_category && menuItemData.new_category_name) {
        const resp_new_category = await CreateCategoryAPI(
          { name: menuItemData.new_category_name },
          dispatch
        );
        if (resp_new_category.success === 1) {
          category_id_list.push(resp_new_category.data.id);
        }
      }

      // Convert arrays to comma-separated strings for API
      const allergyIds = Array.isArray(menuItemData.allergens)
        ? menuItemData.allergens
        : typeof menuItemData.allergens === 'string'
        ? menuItemData.allergens.split(',').map(x => parseInt(x)).filter(x => !isNaN(x))
        : [];

      const applianceIds = Array.isArray(menuItemData.appliances)
        ? menuItemData.appliances
        : typeof menuItemData.appliances === 'string'
        ? menuItemData.appliances.split(',').map(x => parseInt(x)).filter(x => !isNaN(x))
        : [];

      // Prepare API params
      const params: IMenu & any = {
        title: menuItemData.title,
        description: menuItemData.description,
        price: menuItemData.price_string ?? menuItemData.price,
        serving_size: menuItemData.serving_size && menuItemData.serving_size > 0 ? menuItemData.serving_size : 1,
        meals: 'breakfast',
        category_ids: category_id_list.join(','),
        allergens: allergyIds.join(','),
        appliances: applianceIds.join(','),
        estimated_time: menuItemData.estimated_time ?? 0,
        is_live: menuItemData.is_live ?? 1,
        customizations: JSON.stringify(menuItemData.customizations ?? []),
      };

      // Create or update menu item
      let resp_menu;
      if (info && info.id !== undefined) {
        params.id = info.id;
        resp_menu = await UpdateMenuAPI(params, dispatch);
      } else {
        resp_menu = await CreateMenuAPI(params, dispatch);
      }

      if (resp_menu.success === 1) {
        ShowSuccessToast(
          info ? 'Menu item updated successfully!' : 'Menu item added successfully!'
        );
        dispatch(hideLoading());

        // Check if this is the first menu item during onboarding
        // Navigate to Home tab to show progress, otherwise go back to previous screen
        const isOnboarding = self.is_pending === 1;
        const isFirstMenuItem = !info && menus.length === 0;

        if (isOnboarding && isFirstMenuItem) {
          // Take chef to Home tab to see their onboarding progress
          navigate.toChef.home();
        } else {
          // Normal flow: return to previous screen (Menu tab or wherever they came from)
          goBack();
        }
      } else {
        ShowErrorToast(resp_menu.error || resp_menu.message);
        dispatch(hideLoading());
      }
    } catch (error) {
      ShowErrorToast('An error occurred. Please try again.');
      dispatch(hideLoading());
    }
  };

  // Render current step
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <StepMenuItemName
            menuItemData={menuItemData}
            onUpdateMenuItemData={handleUpdateMenuItemData}
            onNext={() => setStep(2)}
            onBack={goBack}
          />
        );
      case 2:
        return (
          <StepMenuItemDescription
            menuItemData={menuItemData}
            onUpdateMenuItemData={handleUpdateMenuItemData}
            onNext={async (finalDescription?: string) => {
              await analyzeAndPopulateMetadata(finalDescription);
              setStep(3);
            }}
            onBack={() => setStep(1)}
          />
        );
      case 3:
        return (
          <StepMenuItemCategories
            menuItemData={menuItemData}
            onUpdateMenuItemData={handleUpdateMenuItemData}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        );
      case 4:
        return (
          <StepMenuItemAllergens
            menuItemData={menuItemData}
            onUpdateMenuItemData={handleUpdateMenuItemData}
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
          />
        );
      case 5:
        return (
          <StepMenuItemKitchen
            menuItemData={menuItemData}
            onUpdateMenuItemData={handleUpdateMenuItemData}
            onNext={() => setStep(6)}
            onBack={() => setStep(4)}
          />
        );
      case 6:
        return (
          <StepMenuItemPricing
            menuItemData={menuItemData}
            onUpdateMenuItemData={handleUpdateMenuItemData}
            onNext={() => setStep(7)}
            onBack={() => setStep(5)}
          />
        );
      case 7:
        return (
          <StepMenuItemCustomizations
            menuItemData={menuItemData}
            onUpdateMenuItemData={handleUpdateMenuItemData}
            onNext={() => setStep(8)}
            onBack={() => setStep(6)}
            onSkip={() => setStep(8)}
          />
        );
      case 8:
        return (
          <StepMenuItemReview
            menuItemData={menuItemData}
            onUpdateMenuItemData={handleUpdateMenuItemData}
            onComplete={handleCompleteMenuItem}
            onBack={() => setStep(7)}
          />
        );
      default:
        return null;
    }
  };

  // Handle back button press from Container header
  const handleHeaderBack = () => {
    if (step === 1) {
      // If on first step, exit the flow
      goBack();
    } else {
      // Otherwise, go back one step
      setStep(step - 1);
    }
  };

  return (
    <SafeAreaView style={styles.main}>
      <Container
        backMode
        title={info ? 'Edit Menu Item' : 'Add Menu Item'}
        containerStyle={{ marginBottom: 0 }}
        onBack={handleHeaderBack}
      >
        {renderStep()}
      </Container>
    </SafeAreaView>
  );
};

export default AddMenuItem;
