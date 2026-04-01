import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { inventoryService } from '../services/inventory.service';
import type {
  Category,
  ProductBatch,
  ProductSummary,
  SaleDetail,
  Supplier,
} from '../types/inventory.types';
import { getErrorMessage } from '../utils/inventory-format';

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  availableQuantity: number;
}

export interface FlashMessage {
  type: 'success' | 'error';
  text: string;
}

export function useInventoryWorkspace() {
  const { user } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'employee';

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<ProductBatch[]>([]);
  const [selectedBatchProductName, setSelectedBatchProductName] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastSale, setLastSale] = useState<SaleDetail | null>(null);
  const [loadedSale, setLoadedSale] = useState<SaleDetail | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [flashMessage, setFlashMessage] = useState<FlashMessage | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [hasLoadedWorkspace, setHasLoadedWorkspace] = useState(false);
  const [saleLookupId, setSaleLookupId] = useState('');
  const [returnReason, setReturnReason] = useState('');

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  });
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
  });
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    salePrice: '',
    categoryId: '',
    description: '',
    barcode: '',
    unit: 'unit',
  });
  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: '',
    productId: '',
    batchNumber: '',
    expiryDate: '',
    quantity: '1',
    unitCost: '',
    invoiceNumber: '',
    notes: '',
  });

  function resolveProductId(productData: ProductSummary[], currentProductId: string) {
    return productData.some((product) => product.id === currentProductId)
      ? currentProductId
      : productData[0]?.id || '';
  }

  async function loadReferenceData() {
    const [categoryData, supplierData] = await Promise.all([
      inventoryService.listCategories(),
      inventoryService.listSuppliers(),
    ]);

    startTransition(() => {
      setCategories(categoryData);
      setSuppliers(supplierData);
    });

    setPurchaseForm((current) => ({
      ...current,
      supplierId: current.supplierId || supplierData[0]?.id || '',
    }));
    setProductForm((current) => ({
      ...current,
      categoryId: current.categoryId || categoryData[0]?.id || '',
    }));
  }

  async function loadProducts(currentSearch = deferredSearchTerm) {
    setIsLoadingProducts(true);

    try {
      const productData = await inventoryService.listProducts(currentSearch.trim());
      startTransition(() => {
        setProducts(productData);
      });
      setPurchaseForm((current) => ({
        ...current,
        productId: resolveProductId(productData, current.productId),
      }));
    } finally {
      setIsLoadingProducts(false);
    }
  }

  async function initializeWorkspace() {
    const [categoryData, supplierData, productData] = await Promise.all([
      inventoryService.listCategories(),
      inventoryService.listSuppliers(),
      inventoryService.listProducts(''),
    ]);

    startTransition(() => {
      setCategories(categoryData);
      setSuppliers(supplierData);
      setProducts(productData);
    });

    setPurchaseForm((current) => ({
      ...current,
      supplierId: current.supplierId || supplierData[0]?.id || '',
      productId: resolveProductId(productData, current.productId),
    }));
    setProductForm((current) => ({
      ...current,
      categoryId: current.categoryId || categoryData[0]?.id || '',
    }));
    setHasLoadedWorkspace(true);
  }

  async function loadBatches(product: ProductSummary) {
    const batches = await inventoryService.listProductBatches(product.id);
    setSelectedBatchProductName(product.name);
    setSelectedBatches(batches);
  }

  async function refreshAfterMutation(options?: {
    productToInspect?: ProductSummary;
    saleToReload?: string;
  }) {
    await Promise.all([
      loadReferenceData(),
      loadProducts(searchTerm),
      options?.saleToReload
        ? inventoryService.getSale(options.saleToReload).then((sale) => {
            setLoadedSale(sale);
            setSaleLookupId(sale.id);
          })
        : Promise.resolve(),
    ]);

    if (options?.productToInspect) {
      await loadBatches(options.productToInspect);
    }
  }

  useEffect(() => {
    if (!isStaff) {
      return;
    }

    void initializeWorkspace().catch((error) => {
      setFlashMessage({ type: 'error', text: getErrorMessage(error) });
    });
  }, [isStaff]);

  useEffect(() => {
    if (!isStaff || !hasLoadedWorkspace) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadProducts(deferredSearchTerm).catch((error) => {
        setFlashMessage({ type: 'error', text: getErrorMessage(error) });
      });
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [deferredSearchTerm, hasLoadedWorkspace, isStaff]);

  async function createCategory() {
    setIsBusy(true);

    try {
      await inventoryService.createCategory(categoryForm);
      setCategoryForm({ name: '', description: '' });
      await loadReferenceData();
      setFlashMessage({ type: 'success', text: 'Category created.' });
    } catch (error) {
      setFlashMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setIsBusy(false);
    }
  }

  async function createSupplier() {
    setIsBusy(true);

    try {
      await inventoryService.createSupplier(supplierForm);
      setSupplierForm({
        name: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
      });
      await loadReferenceData();
      setFlashMessage({ type: 'success', text: 'Supplier created.' });
    } catch (error) {
      setFlashMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setIsBusy(false);
    }
  }

  async function createProduct() {
    setIsBusy(true);

    try {
      await inventoryService.createProduct({
        sku: productForm.sku,
        name: productForm.name,
        salePrice: Number(productForm.salePrice),
        categoryId: productForm.categoryId || undefined,
        description: productForm.description || undefined,
        barcode: productForm.barcode || undefined,
        unit: productForm.unit || undefined,
      });
      setProductForm({
        sku: '',
        name: '',
        salePrice: '',
        categoryId: categories[0]?.id || '',
        description: '',
        barcode: '',
        unit: 'unit',
      });
      await loadProducts(searchTerm);
      setFlashMessage({ type: 'success', text: 'Product created.' });
    } catch (error) {
      setFlashMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setIsBusy(false);
    }
  }

  async function receiveStock() {
    setIsBusy(true);

    try {
      const receipt = await inventoryService.receiveStock({
        supplierId: purchaseForm.supplierId,
        invoiceNumber: purchaseForm.invoiceNumber || undefined,
        notes: purchaseForm.notes || undefined,
        items: [
          {
            productId: purchaseForm.productId,
            batchNumber: purchaseForm.batchNumber,
            expiryDate: `${purchaseForm.expiryDate}T00:00:00.000Z`,
            quantity: Number(purchaseForm.quantity),
            unitCost: Number(purchaseForm.unitCost),
          },
        ],
      });

      setPurchaseForm((current) => ({
        ...current,
        batchNumber: '',
        expiryDate: '',
        quantity: '1',
        unitCost: '',
        invoiceNumber: '',
        notes: '',
      }));

      const selectedProduct = products.find(
        (product) => product.id === receipt.items[0]?.productId,
      );

      await refreshAfterMutation({ productToInspect: selectedProduct });
      setFlashMessage({
        type: 'success',
        text: `Stock received. Purchase ${receipt.id.slice(0, 8)} saved.`,
      });
    } catch (error) {
      setFlashMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setIsBusy(false);
    }
  }

  function addToCart(product: ProductSummary) {
    if (product.availableQuantity <= 0) {
      setFlashMessage({
        type: 'error',
        text: `${product.name} has no sellable stock right now.`,
      });
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, product.availableQuantity),
                availableQuantity: product.availableQuantity,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitPrice: product.salePrice,
          quantity: 1,
          availableQuantity: product.availableQuantity,
        },
      ];
    });
  }

  function changeCartQuantity(productId: string, nextValue: string) {
    const parsed = Number(nextValue);

    setCart((current) =>
      current
        .map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: Number.isNaN(parsed)
                  ? item.quantity
                  : Math.max(1, Math.min(parsed, item.availableQuantity)),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function removeFromCart(productId: string) {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }

  async function checkout() {
    if (!cart.length) {
      return;
    }

    setIsBusy(true);

    try {
      const sale = await inventoryService.checkout({
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });

      setCart([]);
      setLastSale(sale);
      setLoadedSale(sale);
      setSaleLookupId(sale.id);
      setReturnQuantities({});
      await refreshAfterMutation({ saleToReload: sale.id });
      setFlashMessage({
        type: 'success',
        text: `Sale ${sale.id.slice(0, 8)} completed successfully.`,
      });
    } catch (error) {
      setFlashMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setIsBusy(false);
    }
  }

  async function loadSale() {
    if (!saleLookupId.trim()) {
      return;
    }

    setIsBusy(true);

    try {
      const sale = await inventoryService.getSale(saleLookupId.trim());
      setLoadedSale(sale);
      setReturnQuantities({});
      setFlashMessage({
        type: 'success',
        text: `Loaded sale ${sale.id.slice(0, 8)}.`,
      });
    } catch (error) {
      setFlashMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setIsBusy(false);
    }
  }

  async function submitReturn() {
    if (!loadedSale) {
      return;
    }

    const items = Object.entries(returnQuantities)
      .map(([saleItemId, quantity]) => ({
        saleItemId,
        quantity: Number(quantity),
      }))
      .filter((item) => item.quantity > 0);

    if (!items.length) {
      setFlashMessage({
        type: 'error',
        text: 'Enter at least one return quantity.',
      });
      return;
    }

    setIsBusy(true);

    try {
      const receipt = await inventoryService.createReturn({
        saleId: loadedSale.id,
        reason: returnReason || undefined,
        items,
      });

      setReturnReason('');
      setReturnQuantities({});
      await refreshAfterMutation({ saleToReload: loadedSale.id });
      setFlashMessage({
        type: 'success',
        text: `Return ${receipt.id.slice(0, 8)} recorded.`,
      });
    } catch (error) {
      setFlashMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setIsBusy(false);
    }
  }

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  return {
    user,
    isStaff,
    flashMessage,
    isBusy,
    isLoadingProducts,
    categories,
    suppliers,
    products,
    selectedBatches,
    selectedBatchProductName,
    categoryForm,
    setCategoryForm,
    supplierForm,
    setSupplierForm,
    productForm,
    setProductForm,
    purchaseForm,
    setPurchaseForm,
    searchTerm,
    setSearchTerm,
    loadBatches,
    createCategory,
    createSupplier,
    createProduct,
    receiveStock,
    cart,
    cartTotal,
    lastSale,
    addToCart,
    changeCartQuantity,
    removeFromCart,
    checkout,
    saleLookupId,
    setSaleLookupId,
    loadedSale,
    loadSale,
    returnReason,
    setReturnReason,
    returnQuantities,
    setReturnQuantities,
    submitReturn,
  };
}
