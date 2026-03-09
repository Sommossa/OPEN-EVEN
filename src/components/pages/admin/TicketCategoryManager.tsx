import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Trash2, Plus, Edit2, Check, X, IndianRupee, Eye, EyeOff, Tag } from "lucide-react";
import {
    getAllTicketCategories,
    createTicketCategory,
    updateTicketCategory,
    deleteTicketCategory
} from "@/lib/firestore/tickets";
import type { TicketCategory } from "@/lib/firestore/tickets";

const categorySchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    logoUrl: z.string().optional().nullable(),
    color: z.string().min(1, "Color is required"),
    price: z.number().min(0, "Price must be ≥ 0"),
    currency: z.string().min(1),
    totalQuantity: z.number().min(-1),
    isVisible: z.boolean(),
    accessCode: z.string().optional().nullable(),
    perPersonLimit: z.number().min(1),
    isEarlyBird: z.boolean(),
    features: z.array(z.object({ value: z.string() })),
    displayOrder: z.number(),
    isActive: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export function TicketCategoryManager() {
    const [categories, setCategories] = useState<TicketCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            color: "#00C853",
            currency: "INR",
            price: 0,
            totalQuantity: -1,
            perPersonLimit: 1,
            isVisible: true,
            isActive: true,
            isEarlyBird: false,
            displayOrder: 1,
            features: [{ value: "Event Entry" }]
        }
    });

    const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
        control,
        name: "features"
    });

    const watchIsVisible = watch("isVisible");

    const loadCategories = async () => {
        setIsLoading(true);
        try {
            const data = await getAllTicketCategories();
            setCategories(data);
        } catch (err) {
            console.error("Failed to load categories:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleEdit = (category: TicketCategory) => {
        setIsEditing(category.id);
        reset({
            name: category.name,
            description: category.description,
            logoUrl: category.logoUrl,
            color: category.color,
            price: category.price,
            currency: category.currency,
            totalQuantity: category.totalQuantity,
            isVisible: category.isVisible,
            accessCode: category.accessCode,
            perPersonLimit: category.perPersonLimit,
            isEarlyBird: category.isEarlyBird,
            features: category.features.map(f => ({ value: f })),
            displayOrder: category.displayOrder,
            isActive: category.isActive,
        });
        setShowForm(true);
    };

    const handleCreateNew = () => {
        setIsEditing(null);
        reset();
        setShowForm(true);
    };

    const onSubmit = async (data: CategoryFormValues) => {
        setSubmitLoading(true);
        try {
            const cleanData: any = {
                ...data,
                features: data.features.map(f => f.value).filter(v => v.trim() !== ''),
                logoUrl: data.logoUrl || null,
                accessCode: data.isVisible ? null : (data.accessCode || null)
            };

            if (isEditing) {
                await updateTicketCategory(isEditing, cleanData);
            } else {
                await createTicketCategory({
                    ...cleanData,
                    earlyBirdDeadline: null,
                    earlyBirdPrice: null,
                    earlyBirdQuantity: null,
                    saleStartDate: new Date() as any,
                    saleEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) as any,
                    requiresApproval: false,
                    allowedCoupons: [],
                    formFields: [],
                    createdBy: "admin",
                } as any);
            }
            setShowForm(false);
            loadCategories();
        } catch (err) {
            console.error(err);
            alert("Failed to save category");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this category?")) return;
        try {
            await deleteTicketCategory(id);
            loadCategories();
        } catch (err) {
            console.error(err);
            alert("Delete failed");
        }
    };

    const formatINR = (amount: number) => {
        if (amount === 0) return "Free";
        return `₹${amount.toFixed(2)}`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#00C853]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Ticket Categories</h2>
                    <p className="text-gray-500 text-sm">Create and manage ticket types for your event. ({categories.length} categories)</p>
                </div>
                {!showForm && (
                    <button
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 bg-[#00C853] text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-[#007B33] transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> New Category
                    </button>
                )}
            </div>

            {showForm ? (
                <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800">
                            {isEditing ? "Edit Category" : "Create New Category"}
                        </h3>
                        <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Basic Info */}
                        <div>
                            <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">Basic Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                                    <input
                                        {...register("name")}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853]"
                                        placeholder="e.g. General Admission"
                                    />
                                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹ INR) *</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            {...register("price", { valueAsNumber: true })}
                                            className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-gray-800 focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853]"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Enter 0 for free tickets • e.g. 499.00</p>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                    <textarea
                                        {...register("description")}
                                        rows={3}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853] resize-none"
                                        placeholder="What does this ticket include?"
                                    />
                                    {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Quantity & Styling */}
                        <div>
                            <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">Quantity & Appearance</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Quantity</label>
                                    <input
                                        type="number"
                                        {...register("totalQuantity", { valueAsNumber: true })}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853]"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Use -1 for unlimited</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Per Person Limit</label>
                                    <input
                                        type="number"
                                        min="1"
                                        {...register("perPersonLimit", { valueAsNumber: true })}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                                    <input
                                        type="number"
                                        min="1"
                                        {...register("displayOrder", { valueAsNumber: true })}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                    <div className="flex gap-2">
                                        <input type="color" {...register("color")} className="h-10 w-10 p-0.5 bg-white border border-gray-300 rounded cursor-pointer" />
                                        <input type="text" {...register("color")} className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 uppercase focus:outline-none focus:border-[#00C853]" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Features */}
                        <div className="pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Features</h4>
                                <button type="button" onClick={() => appendFeature({ value: "" })} className="text-[#00C853] text-sm font-medium hover:underline">
                                    + Add Feature
                                </button>
                            </div>
                            <div className="space-y-2">
                                {featureFields.map((field, index) => (
                                    <div key={field.id} className="flex gap-2">
                                        <input
                                            {...register(`features.${index}.value`)}
                                            placeholder="e.g. Workshop Access, Lunch Included"
                                            className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:border-[#00C853]"
                                        />
                                        <button type="button" onClick={() => removeFeature(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Visibility & Access */}
                        <div className="pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">Visibility & Access</h4>
                            <div className="flex flex-wrap items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" {...register("isVisible")} className="accent-[#00C853] w-4 h-4" />
                                    <span className="text-sm text-gray-700 font-medium">Visible to Public</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" {...register("isActive")} className="accent-[#00C853] w-4 h-4" />
                                    <span className="text-sm text-gray-700 font-medium">Active</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" {...register("isEarlyBird")} className="accent-[#00C853] w-4 h-4" />
                                    <span className="text-sm text-gray-700 font-medium">Early Bird</span>
                                </label>
                            </div>

                            {!watchIsVisible && (
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Access Code (required for hidden categories)</label>
                                    <input
                                        {...register("accessCode")}
                                        placeholder="e.g. VIP2026"
                                        className="w-full max-w-sm bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 uppercase focus:outline-none focus:border-[#00C853] focus:ring-1 focus:ring-[#00C853]"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitLoading}
                                className="flex items-center gap-2 bg-[#00C853] text-white px-6 py-2 rounded-lg font-medium text-sm hover:bg-[#007B33] transition-colors disabled:opacity-50"
                            >
                                {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                {isEditing ? "Update Category" : "Create Category"}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <>
                    {categories.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
                            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-800 mb-1">No Ticket Categories</h3>
                            <p className="text-gray-500 text-sm mb-6">Create your first ticket category to get started.</p>
                            <button
                                onClick={handleCreateNew}
                                className="inline-flex items-center gap-2 bg-[#00C853] text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-[#007B33] transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Create Category
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categories.map(cat => (
                                <div key={cat.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                                    {/* Color stripe at top */}
                                    <div className="h-1.5" style={{ backgroundColor: cat.color }} />

                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: cat.color, backgroundColor: `${cat.color}30` }} />
                                                <h3 className="font-bold text-gray-800 text-lg">{cat.name}</h3>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(cat)} className="p-1.5 hover:bg-green-50 rounded text-gray-400 hover:text-[#00C853] transition-colors" title="Edit">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(cat.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{cat.description}</p>

                                        <div className="flex items-center gap-2 mb-4">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium border ${cat.isVisible
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-orange-50 text-orange-700 border-orange-200'
                                                }`}>
                                                {cat.isVisible ? '👁 Public' : `🔒 ${cat.accessCode || 'Hidden'}`}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium border ${cat.isActive
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-gray-50 text-gray-500 border-gray-200'
                                                }`}>
                                                {cat.isActive ? '✓ Active' : 'Inactive'}
                                            </span>
                                            {cat.isEarlyBird && (
                                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                    🕐 Early Bird
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-baseline gap-1 mb-4">
                                            <span className="text-2xl font-bold text-gray-900">{formatINR(cat.price)}</span>
                                            {cat.price > 0 && <span className="text-xs text-gray-500">INR / person</span>}
                                        </div>

                                        <div className="pt-3 border-t border-gray-100 space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Sold</span>
                                                <span className="font-semibold text-gray-800">{cat.soldCount || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Available</span>
                                                <span className="font-semibold text-gray-800">
                                                    {cat.totalQuantity === -1 ? 'Unlimited' : (cat.availableQuantity ?? cat.totalQuantity)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Per-person Limit</span>
                                                <span className="font-semibold text-gray-800">{cat.perPersonLimit}</span>
                                            </div>
                                        </div>

                                        {cat.features && cat.features.length > 0 && (
                                            <div className="pt-3 mt-3 border-t border-gray-100">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Features</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {cat.features.slice(0, 4).map((f, i) => (
                                                        <span key={i} className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-600 border border-gray-100">
                                                            {f}
                                                        </span>
                                                    ))}
                                                    {cat.features.length > 4 && (
                                                        <span className="text-xs px-2 py-1 text-gray-400">+{cat.features.length - 4} more</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
