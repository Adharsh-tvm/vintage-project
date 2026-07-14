import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Layout } from '../layout/Layout';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import {
  ShoppingCart, Star, ChevronLeft, ChevronRight, Search, X,
  StarHalf, Menu, SlidersHorizontal, ChevronDown, ChevronUp, Package,
  Tag, ArrowUpDown, Filter
} from 'lucide-react';
import { cn } from '../../lib/util';
import { Input } from '../../ui/Input';
import { Checkbox } from '../../ui/Checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/Select';
import { useSearchParams, useNavigate } from 'react-router';
import { Categories } from '../layout/Categories';
import { Slider } from "../../ui/Slider";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../ui/pagination';
import { toast } from '../../hooks/useToast';
import { useDispatch } from 'react-redux';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { debounce } from 'lodash';
import { globalSearchApi, productsListfetchBrands, productsListfetchCategories, productsListfetchProducts, productsListHandleSearch } from '../../services/api/userApis/userProductApi';

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL'];

const ProductListing = () => {

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [activeImage, setActiveImage] = useState({});
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const [showAllBrands, setShowAllBrands] = useState(false);

  // search queries
  const [searchParams, setSearchParams] = useSearchParams();
  const [priceRange, setPriceRange] = useState([
    Number(searchParams.get('minPrice')) || 0,
    Number(searchParams.get('maxPrice')) || 10000
  ]);
  const [selectedCategories, setSelectedCategories] = useState(
    searchParams.getAll('category') || []
  );
  const [selectedBrands, setSelectedBrands] = useState(
    searchParams.getAll('brand') || []
  );
  const [selectedSizes, setSelectedSizes] = useState(
    searchParams.getAll('size') || []
  );
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');

  // Temporary states for filter values before applying
  const [tempPriceRange, setTempPriceRange] = useState(priceRange);
  const [tempCategories, setTempCategories] = useState(
    searchParams.getAll('category') || []
  );
  const [tempBrands, setTempBrands] = useState(
    searchParams.getAll('brand') || []
  );
  const [tempSizes, setTempSizes] = useState(
    searchParams.getAll('size') || []
  );
  const [tempSort, setTempSort] = useState(sortBy);

  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(8);

  const navigate = useNavigate();

  // Search states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const dispatch = useDispatch();

  const [search, setSearch] = useState("");
  const [searchedProducts, setSearchedProducts] = useState([]);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const searchInputRef = useRef(null);

  const handleSearch = async () => {
    if (!search) return;
    try {
      const { data } = await productsListHandleSearch(search);
      setSearchedProducts(data.products);
    } catch (error) {
      console.error("Error fetching search results:", error);
    }
  };

  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl) {
      setSearchQuery(searchFromUrl);
      setSearch(searchFromUrl);
      setDebouncedSearchQuery(searchFromUrl);
    } else {
      setSearchQuery('');
      setSearch('');
      setDebouncedSearchQuery('');
    }

    const cats = searchParams.getAll('category');
    setSelectedCategories(cats);
    setTempCategories(cats);

    const brnds = searchParams.getAll('brand');
    setSelectedBrands(brnds);
    setTempBrands(brnds);

    const szs = searchParams.getAll('size');
    setSelectedSizes(szs);
    setTempSizes(szs);

    const sortVal = searchParams.get('sort') || 'newest';
    setSortBy(sortVal);
    setTempSort(sortVal);
  }, [searchParams]);

  const fetchProducts = async (params) => {
    try {
      const queryParams = new URLSearchParams(params);
      queryParams.set('page', currentPage);
      queryParams.set('limit', itemsPerPage);
      const searchVal = queryParams.get('search');
      if (searchVal && searchVal.trim()) {
        queryParams.set('search', searchVal.trim());
      } else {
        queryParams.delete('search');
      }
      const response = await productsListfetchProducts(queryParams);
      setProducts(response.data.products || []);
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.totalPages);
        setCurrentPage(response.data.pagination.currentPage);
      }
    } catch (error) {
      console.log(error);
      setTotalPages(1);
    }
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage);
    setSearchParams(params);
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const params = searchParams.toString();
    fetchProducts(params);
  }, [searchParams, currentPage]);

  const handleApplyFilters = () => {
    setSelectedCategories(tempCategories);
    setSelectedBrands(tempBrands);
    setPriceRange(tempPriceRange);
    setSortBy(tempSort);
    setSelectedSizes(tempSizes);

    const params = new URLSearchParams();
    tempCategories.forEach(categoryId => params.append('category', categoryId));
    tempBrands.forEach(brandId => params.append('brand', brandId));
    params.set('minPrice', tempPriceRange[0]);
    params.set('maxPrice', tempPriceRange[1]);
    if (tempSort !== 'newest') params.set('sort', tempSort);
    tempSizes.forEach(size => params.append('size', size));
    const searchVal = searchParams.get('search');
    if (searchVal) {
      params.set('search', searchVal);
    }
    setSearchParams(params);
    fetchProducts(params);
    setShowMobileFilters(false);
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setTempCategories([]);
    setTempBrands([]);
    setPriceRange([0, 10000]);
    setTempPriceRange([0, 10000]);
    setSortBy('newest');
    setTempSort('newest');
    setSelectedSizes([]);
    setTempSizes([]);
    setSearchParams({});
  };

  const handleCategoryChange = (category) => {
    setTempCategories(prev => {
      const isSelected = prev.includes(category._id);
      if (isSelected) return prev.filter(id => id !== category._id);
      return [...prev, category._id];
    });
  };

  const handleBrandChange = (brand) => {
    setTempBrands(prev => {
      const isSelected = prev.includes(brand._id);
      if (isSelected) return prev.filter(id => id !== brand._id);
      return [...prev, brand._id];
    });
  };

  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await productsListfetchCategories();
      const categoriesData = response.data.categories || response.data;
      const activeCategories = categoriesData.filter(category =>
        !category.isBlocked && category.status !== 'Not listed'
      );
      setCategories(activeCategories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await productsListfetchBrands();
      const brandsData = response.data.brands || response.data;
      const activeBrands = brandsData.filter(brand =>
        !brand.isBlocked && brand.status !== 'Not listed'
      );
      setBrands(activeBrands);
    } catch (error) {
      console.error('Failed to fetch brands:', error);
    }
  };

  const getLowestPrice = (product) => {
    const activeVariants = product.variants.filter(variant => !variant.isBlocked);
    return Math.min(...activeVariants.map(variant => variant.price));
  };

  const filteredProducts = products.filter(product => {
    if (product.isBlocked) return false;
    if (product.brand.status === 'Not listed') return false;
    if (product.category.status === 'Not listed') return false;
    const activeVariants = product.variants.filter(variant => !variant.isBlocked);
    if (activeVariants.length === 0) return false;
    const productLowestPrice = Math.min(...activeVariants.map(variant => variant.price));
    if (productLowestPrice < priceRange[0] || productLowestPrice > priceRange[1]) return false;
    if (selectedCategories.length > 0 && !selectedCategories.includes(product.category._id)) return false;
    if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand._id)) return false;
    if (selectedSizes.length > 0) {
      const activeSizes = activeVariants.map(variant => variant.size);
      if (!selectedSizes.some(size => activeSizes.includes(size))) return false;
    }
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return getLowestPrice(a) - getLowestPrice(b);
      case 'price-high': return getLowestPrice(b) - getLowestPrice(a);
      case 'a-z': return a.name.localeCompare(b.name);
      case 'z-a': return b.name.localeCompare(a.name);
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const handleSizeChange = (size) => {
    setTempSizes(prev => {
      const isSelected = prev.includes(size);
      if (isSelected) return prev.filter(s => s !== size);
      return [...prev, size];
    });
  };

  React.useEffect(() => {
    const initialActiveImages = {};
    products.forEach(product => {
      if (product.variants.length > 0) {
        initialActiveImages[product._id] = product.variants[0].mainImage;
      }
    });
    setActiveImage(initialActiveImages);
  }, [products]);

  const handleImageChange = (productId, imageUrl) => {
    setActiveImage(prev => ({ ...prev, [productId]: imageUrl }));
  };

  const formatPrice = (price) => `₹${(price).toFixed(0)}`;

  const getAllImages = (product) => {
    const variantWithSubImages = product.variants.find(v => v.subImages.length > 0);
    if (variantWithSubImages) {
      return [variantWithSubImages.mainImage, ...variantWithSubImages.subImages];
    }
    return product.variants.length > 0 ? [product.variants[0].mainImage] : [];
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />);
    }
    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="h-3 w-3 fill-amber-400 text-amber-400" />);
    }
    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-3 w-3 text-gray-200" />);
    }
    return stars;
  };

  const PriceDisplay = ({ originalPrice, discountPrice }) => {
    if (!originalPrice) return null;
    const hasValidDiscount = discountPrice && discountPrice > 0 && discountPrice < originalPrice;
    const discountPercent = hasValidDiscount
      ? Math.round((originalPrice - discountPrice) / originalPrice * 100)
      : 0;

    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-gray-900" style={{ fontSize: '1.1rem' }}>
          {hasValidDiscount ? formatPrice(discountPrice) : formatPrice(originalPrice)}
        </span>
        {hasValidDiscount && (
          <>
            <span className="text-gray-400 line-through text-sm">{formatPrice(originalPrice)}</span>
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{ background: '#f0fdf4', color: '#16a34a' }}
            >
              −{discountPercent}%
            </span>
          </>
        )}
      </div>
    );
  };

  const handleGlobalSearch = useCallback(
    debounce(async (searchTerm) => {
      if (!searchTerm.trim()) {
        setSearchedProducts([]);
        return;
      }
      try {
        const { data } = await globalSearchApi(searchTerm);
        if (data.success && Array.isArray(data.products)) {
          const validProducts = data.products.filter(product =>
            product.variants && product.variants.length > 0 && !product.isBlocked
          );
          setSearchedProducts(validProducts);
        }
      } catch (error) {
        console.error("Search error:", error);
      }
    }, 300),
    []
  );

  useEffect(() => {
    handleGlobalSearch(globalSearch);
  }, [globalSearch]);

  useEffect(() => {
    if (showSearchBar && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearchBar]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-container')) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchItemClick = (productId) => {
    navigate(`/products/${productId}`);
    setShowSearchBar(false);
    setShowSearchDropdown(false);
    setGlobalSearch('');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== debouncedSearchQuery) {
        setDebouncedSearchQuery(searchQuery);
        const params = new URLSearchParams(searchParams);
        if (searchQuery) {
          params.set('search', searchQuery);
        } else {
          params.delete('search');
        }
        setSearchParams(params);
        setCurrentPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery('');
    const params = new URLSearchParams(searchParams);
    params.delete('search');
    setSearchParams(params);
  };

  const handleProductClick = (productId) => {
    navigate(`/products/${productId}`);
  };

  const activeFilterCount =
    tempCategories.length + tempBrands.length + tempSizes.length +
    (tempPriceRange[0] > 0 || tempPriceRange[1] < 10000 ? 1 : 0);

  // ─── Sidebar Content ────────────────────────────────────────────────────────
  const sidebarContent = (
    <div>
      {/* Sort By */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <ArrowUpDown size={14} style={{ color: '#9ca3af' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#718096' }}>Sort By</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {[
            { value: 'newest', label: 'Newest First' },
            { value: 'price-low', label: 'Price: Low to High' },
            { value: 'price-high', label: 'Price: High to Low' },
            { value: 'a-z', label: 'Name: A to Z' },
            { value: 'z-a', label: 'Name: Z to A' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setTempSort(opt.value)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '0.45rem 0.625rem', borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: tempSort === opt.value ? 600 : 400,
                color: tempSort === opt.value ? '#1a202c' : '#4a5568',
                background: tempSort === opt.value ? '#edf2f7' : 'transparent',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                transition: 'background 0.15s',
              }}
            >
              {tempSort === opt.value && (
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1a202c', display: 'inline-block', flexShrink: 0 }} />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: '1px', background: '#edf2f7', margin: '0 0 1.5rem' }} />

      {/* Price Range */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Tag size={14} style={{ color: '#9ca3af' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#718096' }}>Price Range</span>
        </div>
        <Slider
          min={0} max={10000} step={100}
          value={tempPriceRange}
          onValueChange={setTempPriceRange}
          className="mt-2 mb-4"
        />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <div style={{ flex: 1, background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.4rem 0.625rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: '#9ca3af', marginBottom: '0.1rem', fontWeight: 600, letterSpacing: '0.05em' }}>MIN</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a202c' }}>₹{tempPriceRange[0].toLocaleString()}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: '#cbd5e0', fontSize: '0.875rem' }}>—</div>
          <div style={{ flex: 1, background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.4rem 0.625rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: '#9ca3af', marginBottom: '0.1rem', fontWeight: 600, letterSpacing: '0.05em' }}>MAX</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a202c' }}>₹{tempPriceRange[1].toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style={{ height: '1px', background: '#edf2f7', margin: '0 0 1.5rem' }} />

      {/* Categories */}
      {categories.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Filter size={14} style={{ color: '#9ca3af' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#718096' }}>Categories</span>
            {tempCategories.length > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: '#1a202c', color: '#fff', borderRadius: '999px', padding: '0.1rem 0.4rem', fontWeight: 700 }}>
                {tempCategories.length}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {categories.map((category) => (
              <label
                key={category._id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  padding: '0.4rem 0.5rem', borderRadius: '0.5rem',
                  cursor: 'pointer',
                  background: tempCategories.includes(category._id) ? '#f7fafc' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <Checkbox
                  id={`category-${category._id}`}
                  checked={tempCategories.includes(category._id)}
                  onCheckedChange={() => handleCategoryChange(category)}
                />
                <span style={{ fontSize: '0.875rem', color: '#2d3748', fontWeight: tempCategories.includes(category._id) ? 600 : 400 }}>
                  {category.name}
                </span>
              </label>
            ))}
          </div>
          <div style={{ height: '1px', background: '#edf2f7', margin: '1.25rem 0 0' }} />
        </div>
      )}

      {/* Brands */}
      {brands.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Package size={14} style={{ color: '#9ca3af' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#718096' }}>Brands</span>
            {tempBrands.length > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: '#1a202c', color: '#fff', borderRadius: '999px', padding: '0.1rem 0.4rem', fontWeight: 700 }}>
                {tempBrands.length}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {(showAllBrands ? brands : brands.slice(0, 6)).map((brand) => (
              <label
                key={brand._id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  padding: '0.4rem 0.5rem', borderRadius: '0.5rem',
                  cursor: 'pointer',
                  background: tempBrands.includes(brand._id) ? '#f7fafc' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <Checkbox
                  id={`brand-${brand._id}`}
                  checked={tempBrands.includes(brand._id)}
                  onCheckedChange={() => handleBrandChange(brand)}
                />
                <span style={{ fontSize: '0.875rem', color: '#2d3748', fontWeight: tempBrands.includes(brand._id) ? 600 : 400 }}>
                  {brand.name}
                </span>
              </label>
            ))}
          </div>
          {brands.length > 6 && (
            <button
              onClick={() => setShowAllBrands(!showAllBrands)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                fontSize: '0.8rem', color: '#718096', fontWeight: 500,
                background: 'none', border: 'none', cursor: 'pointer',
                marginTop: '0.5rem', padding: '0.25rem 0.5rem',
              }}
            >
              {showAllBrands ? <><ChevronUp size={14} />Show less</> : <><ChevronDown size={14} />Show {brands.length - 6} more</>}
            </button>
          )}
          <div style={{ height: '1px', background: '#edf2f7', margin: '1.25rem 0 0' }} />
        </div>
      )}

      {/* Size */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#718096' }}>Size</span>
          {tempSizes.length > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: '#1a202c', color: '#fff', borderRadius: '999px', padding: '0.1rem 0.4rem', fontWeight: 700 }}>
              {tempSizes.length}
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
          {DEFAULT_SIZES.map((size) => {
            const isSelected = tempSizes.includes(size);
            return (
              <button
                key={size}
                onClick={() => handleSizeChange(size)}
                style={{
                  padding: '0.4rem 0', borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 700 : 500,
                  border: isSelected ? '2px solid #1a202c' : '1.5px solid #e2e8f0',
                  background: isSelected ? '#1a202c' : '#fff',
                  color: isSelected ? '#fff' : '#4a5568',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* CTA Buttons */}
      <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '1rem', marginTop: '0.25rem' }}>
        <button
          onClick={handleApplyFilters}
          style={{
            width: '100%', padding: '0.75rem', borderRadius: '0.75rem',
            background: '#1a202c', color: '#fff',
            fontWeight: 700, fontSize: '0.875rem',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            marginBottom: '0.5rem', transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#2d3748'}
          onMouseLeave={e => e.currentTarget.style.background = '#1a202c'}
        >
          <SlidersHorizontal size={15} />
          Apply Filters
          {activeFilterCount > 0 && (
            <span style={{ background: '#fff', color: '#1a202c', borderRadius: '999px', padding: '0.1rem 0.45rem', fontSize: '0.7rem', fontWeight: 800 }}>
              {activeFilterCount}
            </span>
          )}
        </button>
        <button
          onClick={handleClearFilters}
          style={{
            width: '100%', padding: '0.6rem', borderRadius: '0.75rem',
            background: 'transparent', color: '#718096',
            fontWeight: 500, fontSize: '0.8rem',
            border: '1.5px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e0'; e.currentTarget.style.color = '#4a5568'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#718096'; }}
        >
          Clear all filters
        </button>
      </div>
    </div>
  );

  // ─── Pagination ──────────────────────────────────────────────────────────────
  const generatePaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;

    items.push(
      <PaginationItem key={1}>
        <PaginationLink onClick={() => handlePageChange(1)} isActive={currentPage === 1}>1</PaginationLink>
      </PaginationItem>
    );

    let startPage = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 2);

    if (startPage > 2) {
      items.push(<PaginationItem key="ellipsis-1"><PaginationEllipsis /></PaginationItem>);
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink onClick={() => handlePageChange(i)} isActive={currentPage === i}>{i}</PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < totalPages - 1) {
      items.push(<PaginationItem key="ellipsis-2"><PaginationEllipsis /></PaginationItem>);
    }

    if (totalPages > 1) {
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => handlePageChange(totalPages)} isActive={currentPage === totalPages}>{totalPages}</PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <Layout showSidebar={true} sidebarContent={sidebarContent}>

      {/* Mobile Filter Button */}
      <div className="md:hidden fixed top-20 left-4 z-50">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.5rem 1rem', borderRadius: '999px',
            background: '#111827', color: '#fff',
            fontSize: '0.8rem', fontWeight: 600,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span style={{ background: '#fff', color: '#111827', borderRadius: '999px', padding: '0.05rem 0.4rem', fontSize: '0.65rem', fontWeight: 800 }}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Filter Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          showMobileFilters ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setShowMobileFilters(false)}
      />

      {/* Mobile Filter Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 w-[85%] max-w-[320px] bg-white z-50 transform transition-transform duration-300",
          showMobileFilters ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>Filters</h2>
            {activeFilterCount > 0 && (
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.1rem' }}>{activeFilterCount} active</p>
            )}
          </div>
          <button
            onClick={() => setShowMobileFilters(false)}
            style={{ background: '#f3f4f6', border: 'none', borderRadius: '0.5rem', padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={18} color="#374151" />
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column' }}>
          {sidebarContent}
        </div>
      </div>

      {/* Global Search Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 transition-all duration-300",
          showSearchBar ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        style={{ backdropFilter: showSearchBar ? 'blur(4px)' : 'none', background: showSearchBar ? 'rgba(0,0,0,0.25)' : 'transparent' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowSearchBar(false);
            setShowSearchDropdown(false);
            setGlobalSearch('');
          }
        }}
      >
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            background: '#fff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            transform: showSearchBar ? 'translateY(0)' : 'translateY(-100%)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
            <div className="search-container" style={{ position: 'relative' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={20} style={{ position: 'absolute', left: '1rem', color: '#9ca3af', pointerEvents: 'none', zIndex: 1 }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for products, brands, categories..."
                  value={globalSearch}
                  onChange={(e) => { setGlobalSearch(e.target.value); setShowSearchDropdown(true); }}
                  style={{
                    width: '100%',
                    padding: '0.875rem 3rem 0.875rem 3rem',
                    fontSize: '1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '0.75rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    background: '#f9fafb',
                  }}
                  onFocus={e => e.target.style.borderColor = '#111827'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
                {globalSearch && (
                  <button
                    onClick={() => { setGlobalSearch(''); setSearchedProducts([]); }}
                    style={{ position: 'absolute', right: '1rem', background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={14} color="#6b7280" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showSearchDropdown && globalSearch.trim() && searchedProducts.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 0.5rem)', left: 0, right: 0,
                  background: '#fff', borderRadius: '0.75rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  border: '1px solid #f3f4f6',
                  maxHeight: '60vh', overflowY: 'auto', zIndex: 10,
                }}>
                  <div style={{ padding: '0.5rem 0' }}>
                    <div style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af' }}>
                      {searchedProducts.length} result{searchedProducts.length !== 1 ? 's' : ''}
                    </div>
                    {searchedProducts.map((product) => (
                      <div
                        key={product._id}
                        onClick={() => handleSearchItemClick(product._id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.875rem',
                          padding: '0.75rem 1rem', cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: '3rem', height: '3.5rem', borderRadius: '0.5rem', overflow: 'hidden', flexShrink: 0, background: '#f3f4f6' }}>
                          <img
                            src={product.variants[0]?.mainImage}
                            alt={product.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {product.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.1rem' }}>{product.category?.name}</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', marginTop: '0.25rem' }}>
                            ₹{Math.min(...product.variants.map(v => v.price)).toLocaleString()}
                          </div>
                        </div>
                        <ChevronRight size={16} color="#d1d5db" style={{ flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Close hint */}
            <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: '#9ca3af' }}>
              Press <kbd style={{ padding: '0.1rem 0.4rem', background: '#f3f4f6', borderRadius: '0.25rem', fontSize: '0.7rem', fontWeight: 600 }}>Esc</kbd> or click outside to close
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ padding: '2rem 1.5rem 3rem' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', color: '#9ca3af', marginBottom: '1.5rem' }}>
          <span style={{ cursor: 'pointer', color: '#6b7280' }} onClick={() => navigate('/')}>Home</span>
          <ChevronRight size={14} />
          <span style={{ color: '#111827', fontWeight: 500 }}>All Products</span>
        </div>

        {/* Header */}
        {/* <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            All Jackets
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''} found
          </p>
        </div> */}

        {/* Search Results Query Indicator */}
        {searchQuery && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              Showing {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} for "<strong>{searchQuery}</strong>"
            </p>
            <button
              onClick={handleClearSearch}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                color: '#ef4444',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '0.5rem',
                padding: '0.25rem 0.6rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; }}
            >
              <X size={12} />
              Clear Search
            </button>
          </div>
        )}

        {/* Active filter chips */}
        {(selectedCategories.length > 0 || selectedBrands.length > 0 || selectedSizes.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', marginRight: '0.25rem' }}>Active filters:</span>
            {selectedCategories.map(id => {
              const cat = categories.find(c => c._id === id);
              return cat ? (
                <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', background: '#111827', color: '#fff', borderRadius: '999px', padding: '0.2rem 0.65rem', fontWeight: 500 }}>
                  {cat.name}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => { setSelectedCategories(prev => prev.filter(i => i !== id)); setTempCategories(prev => prev.filter(i => i !== id)); }} />
                </span>
              ) : null;
            })}
            {selectedBrands.map(id => {
              const brand = brands.find(b => b._id === id);
              return brand ? (
                <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', background: '#111827', color: '#fff', borderRadius: '999px', padding: '0.2rem 0.65rem', fontWeight: 500 }}>
                  {brand.name}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => { setSelectedBrands(prev => prev.filter(i => i !== id)); setTempBrands(prev => prev.filter(i => i !== id)); }} />
                </span>
              ) : null;
            })}
            {selectedSizes.map(size => (
              <span key={size} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', background: '#111827', color: '#fff', borderRadius: '999px', padding: '0.2rem 0.65rem', fontWeight: 500 }}>
                {size}
                <X size={11} style={{ cursor: 'pointer' }} onClick={() => { setSelectedSizes(prev => prev.filter(s => s !== size)); setTempSizes(prev => prev.filter(s => s !== size)); }} />
              </span>
            ))}
            <button
              onClick={handleClearFilters}
              style={{ fontSize: '0.75rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: '0' }}
            >
              Clear all
            </button>
          </div>
        )}

        {/* Product Grid */}
        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {sortedProducts.map((product) => {
              const images = getAllImages(product);
              const lowestPrice = getLowestPrice(product);
              const availableSizes = [...new Set(product.variants.filter(v => !v.isBlocked).map(v => v.size))];
              const colors = [...new Set(product.variants.map(v => v.color))];
              const discountVariants = product.variants.filter(v => v.discountPrice && v.discountPrice > 0 && v.discountPrice < v.price);
              const discountPrice = discountVariants.length > 0 ? Math.min(...discountVariants.map(v => v.discountPrice)) : null;
              const discountPercent = discountPrice ? Math.round((lowestPrice - discountPrice) / lowestPrice * 100) : 0;
              const isHovered = hoveredProduct === product._id;

              return (
                <div
                  key={product._id}
                  onClick={() => handleProductClick(product._id)}
                  onMouseEnter={() => setHoveredProduct(product._id)}
                  onMouseLeave={() => setHoveredProduct(null)}
                  style={{
                    borderRadius: '1rem',
                    background: '#fff',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: isHovered
                      ? '0 12px 32px rgba(0,0,0,0.12)'
                      : '0 1px 4px rgba(0,0,0,0.06)',
                    transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: '1px solid #f3f4f6',
                  }}
                >
                  {/* Image */}
                  <div style={{ position: 'relative', paddingBottom: '125%', overflow: 'hidden', background: '#f9fafb' }}>
                    <img
                      src={activeImage[product._id] || product.variants[0]?.mainImage || ''}
                      alt={product.name}
                      style={{
                        position: 'absolute', inset: 0, width: '100%', height: '100%',
                        objectFit: 'cover',
                        transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                        transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    />

                    {/* Discount badge */}
                    {discountPercent > 0 && (
                      <div style={{
                        position: 'absolute', top: '0.625rem', left: '0.625rem',
                        background: '#ef4444', color: '#fff',
                        fontSize: '0.7rem', fontWeight: 800,
                        padding: '0.2rem 0.5rem', borderRadius: '0.375rem',
                        letterSpacing: '0.02em',
                      }}>
                        −{discountPercent}%
                      </div>
                    )}



                    {/* Quick view pill */}
                    {isHovered && (
                      <div style={{
                        position: 'absolute', bottom: '0.625rem', left: '50%', transform: 'translateX(-50%)',
                        background: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(4px)',
                        borderRadius: '999px', padding: '0.35rem 0.875rem',
                        fontSize: '0.75rem', fontWeight: 600, color: '#111827',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        animation: 'fadeUp 0.2s ease-out',
                      }}>
                        Quick View
                      </div>
                    )}

                    {/* Thumbnail row overlay */}
                    {images.length > 1 && isHovered && (
                      <div style={{
                        position: 'absolute', bottom: '2.5rem', left: 0, right: 0,
                        display: 'flex', gap: '0.25rem', justifyContent: 'center',
                        padding: '0 0.5rem',
                      }}>
                        {images.slice(0, 4).map((img, index) => (
                          <div
                            key={index}
                            onClick={(e) => { e.stopPropagation(); handleImageChange(product._id, img); }}
                            style={{
                              width: '2rem', height: '2.5rem',
                              borderRadius: '0.375rem', overflow: 'hidden',
                              border: activeImage[product._id] === img ? '2px solid #fff' : '2px solid transparent',
                              opacity: activeImage[product._id] === img ? 1 : 0.75,
                              transition: 'all 0.15s',
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                            }}
                          >
                            <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '0.875rem' }}>
                    {/* Brand + Category */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {product.brand.name}
                      </span>
                      <span style={{ color: '#e5e7eb', fontSize: '0.6rem' }}>•</span>
                      <span style={{ fontSize: '0.7rem', color: '#c4c4c4' }}>{product.category.name}</span>
                    </div>

                    {/* Product Name */}
                    <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', marginBottom: '0.5rem', lineHeight: '1.35', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {product.name}
                    </h3>

                    {/* Stars */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.625rem' }}>
                      <div style={{ display: 'flex' }}>{renderStars(4.5)}</div>
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>(127)</span>
                    </div>

                    {/* Size chips */}
                    {availableSizes.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.625rem' }}>
                        {availableSizes.slice(0, 5).map(size => (
                          <span key={size} style={{ fontSize: '0.65rem', fontWeight: 500, color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.15rem 0.4rem' }}>
                            {size}
                          </span>
                        ))}
                        {availableSizes.length > 5 && (
                          <span style={{ fontSize: '0.65rem', color: '#9ca3af', padding: '0.15rem 0.25rem' }}>+{availableSizes.length - 5}</span>
                        )}
                      </div>
                    )}

                    {/* Color + Price */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>

                      <PriceDisplay originalPrice={lowestPrice} discountPrice={discountPrice} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
            <div style={{
              width: '5rem', height: '5rem', borderRadius: '1.25rem',
              background: '#f9fafb', border: '2px dashed #e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <Package size={28} color="#d1d5db" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>No products found</h3>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '22rem', margin: '0 auto 1.5rem' }}>
              We couldn't find any products matching your filters. Try adjusting or clearing them.
            </p>
            <button
              onClick={handleClearFilters}
              style={{
                padding: '0.625rem 1.5rem', borderRadius: '0.75rem',
                background: '#111827', color: '#fff',
                fontWeight: 600, fontSize: '0.875rem',
                border: 'none', cursor: 'pointer',
              }}
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center' }}>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(currentPage - 1)}
                    className={currentPage === 1 ? 'pointer-events-none opacity-40' : ''}
                  />
                </PaginationItem>
                {generatePaginationItems()}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(currentPage + 1)}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-40' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Inline keyframes for quick-view pill animation */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </Layout>
  );
};

export default ProductListing;
