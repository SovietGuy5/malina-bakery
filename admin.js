"use strict";


/* ============================================================
   CONFIG
   ============================================================ */

const ADMIN_API_URL =
    "https://xheusnpmmmhbwwfcozbr.supabase.co/functions/v1/admin-products";

const ADMIN_UPLOAD_URL =
    "https://xheusnpmmmhbwwfcozbr.supabase.co/functions/v1/admin-upload";

const ADMINS_API_URL =
    "https://xheusnpmmmhbwwfcozbr.supabase.co/functions/v1/admin-admins";


/* ============================================================
   TELEGRAM
   ============================================================ */

const TG =
    window.Telegram?.WebApp || null;


if (TG) {

    TG.ready();

    TG.expand();

}


/* ============================================================
   STATE
   ============================================================ */

let products = [];

let activeCategory = "Все";

let editingId = null;

let loading = false;

let admins = [];

let currentIsOwner = false;


/* ============================================================
   DOM
   ============================================================ */

const productsEl =
    document.getElementById(
        "products",
    );

const searchEl =
    document.getElementById(
        "search",
    );

const filtersEl =
    document.getElementById(
        "filters",
    );

const totalCountEl =
    document.getElementById(
        "totalCount",
    );

const stockCountEl =
    document.getElementById(
        "stockCount",
    );

const outCountEl =
    document.getElementById(
        "outCount",
    );

const modal =
    document.getElementById(
        "modal",
    );

const modalTitle =
    document.getElementById(
        "modalTitle",
    );

const form =
    document.getElementById(
        "productForm",
    );

const toastEl =
    document.getElementById(
        "toast",
    );

const userNameEl =
    document.getElementById(
        "userName",
    );

const imageFileEl =
    document.getElementById(
        "imageFile",
    );

const imagePreview =
    document.getElementById(
        "imagePreview",
    );

const imagePreviewImg =
    document.getElementById(
        "imagePreviewImg",
    );

const currentImage =
    document.getElementById(
        "currentImage",
    );

const currentImageImg =
    document.getElementById(
        "currentImageImg",
    );

const catalogPanel =
    document.getElementById(
        "catalogPanel",
    );

const adminPanel =
    document.getElementById(
        "adminPanel",
    );

const catalogNavButton =
    document.getElementById(
        "catalogNavButton",
    );

const adminsNavButton =
    document.getElementById(
        "adminsNavButton",
    );

const adminsList =
    document.getElementById(
        "adminsList",
    );

const addAdminForm =
    document.getElementById(
        "addAdminForm",
    );

const adminTelegramId =
    document.getElementById(
        "adminTelegramId",
    );

const addAdminButton =
    document.getElementById(
        "addAdminButton",
    );


/* ============================================================
   TOAST
   ============================================================ */

let toastTimer = null;


function toast(
    message,
    error = false,
) {

    clearTimeout(
        toastTimer,
    );

    toastEl.textContent =
        message;

    toastEl.classList.toggle(
        "error",
        error,
    );

    toastEl.classList.add(
        "show",
    );

    toastTimer =
        setTimeout(
            () => {

                toastEl.classList.remove(
                    "show",
                );

            },
            3000,
        );

}


/* ============================================================
   TELEGRAM INIT DATA
   ============================================================ */

function getTelegramInitData() {

    return TG?.initData || "";

}


/* ============================================================
   GENERIC API
   ============================================================ */

async function api(
    method = "GET",
    body = null,
    id = null,
) {

    const url =
        new URL(
            ADMIN_API_URL,
        );


    if (id) {

        url.searchParams.set(
            "id",
            id,
        );

    }


    const headers = {

        "Content-Type":
            "application/json",

        "X-Telegram-Init-Data":
            getTelegramInitData(),

    };


    const response =
        await fetch(
            url.toString(),
            {

                method,

                headers,

                body:
                    body !== null
                        ? JSON.stringify(body)
                        : undefined,

            },
        );


    const text =
        await response.text();


    let data;


    try {

        data =
            text
                ? JSON.parse(text)
                : {};

    } catch {

        throw new Error(
            `Сервер вернул некорректный ответ: ${text}`,
        );

    }


    if (
        !response.ok ||
        data.ok === false
    ) {

        throw new Error(
            data.error ||
            data.message ||
            `HTTP ${response.status}`,
        );

    }


    return data;

}


/* ============================================================
   ADMIN API
   ============================================================ */

async function adminsApi(
    method = "GET",
    body = null,
    telegramId = null,
) {

    const url =
        new URL(
            ADMINS_API_URL,
        );


    if (telegramId !== null) {

        url.searchParams.set(
            "telegram_id",
            String(telegramId),
        );

    }


    const headers = {

        "Content-Type":
            "application/json",

        "X-Telegram-Init-Data":
            getTelegramInitData(),

    };


    const response =
        await fetch(
            url.toString(),
            {

                method,

                headers,

                body:
                    body !== null
                        ? JSON.stringify(body)
                        : undefined,

            },
        );


    const text =
        await response.text();


    let data;


    try {

        data =
            text
                ? JSON.parse(text)
                : {};

    } catch {

        throw new Error(
            `Сервер администраторов вернул некорректный ответ: ${text}`,
        );

    }


    if (
        !response.ok ||
        data.ok === false
    ) {

        throw new Error(
            data.error ||
            data.message ||
            `HTTP ${response.status}`,
        );

    }


    return data;

}


/* ============================================================
   IMAGE UPLOAD
   ============================================================ */

async function uploadProductImage(
    file,
) {

    if (!file) {
        return null;
    }


    if (
        file.size >
        10 * 1024 * 1024
    ) {

        throw new Error(
            "Изображение не должно быть больше 10 MB",
        );

    }


    const allowedTypes = [

        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",

    ];


    if (
        !allowedTypes.includes(
            file.type,
        )
    ) {

        throw new Error(
            "Разрешены только JPG, PNG, WEBP и GIF",
        );

    }


    if (
        !TG?.initData
    ) {

        throw new Error(
            "Откройте админку внутри Telegram",
        );

    }


    const formData =
        new FormData();


    formData.append(
        "file",
        file,
    );


    const response =
        await fetch(
            ADMIN_UPLOAD_URL,
            {

                method: "POST",

                headers: {

                    "X-Telegram-Init-Data":
                        TG.initData,

                },

                body:
                    formData,

            },
        );


    const text =
        await response.text();


    let data;


    try {

        data =
            text
                ? JSON.parse(text)
                : {};

    } catch {

        throw new Error(
            `Ошибка загрузки изображения: ${text}`,
        );

    }


    if (
        !response.ok ||
        data.ok === false
    ) {

        throw new Error(
            data.error ||
            data.message ||
            `Ошибка загрузки изображения (${response.status})`,
        );

    }


    if (
        !data.image?.url
    ) {

        throw new Error(
            "Сервер не вернул URL изображения",
        );

    }


    return data.image.url;

}


/* ============================================================
   LOAD PRODUCTS
   ============================================================ */

async function loadProducts() {

    if (loading) {
        return;
    }


    loading = true;


    productsEl.innerHTML = `
        <div class="state">

            <div class="state-icon">
                ⏳
            </div>

            <div class="state-title">
                Загружаем каталог
            </div>

            <div class="state-text">
                Подождите немного...
            </div>

        </div>
    `;


    try {

        const result =
            await api(
                "GET",
            );


        products =
            Array.isArray(
                result.products,
            )
                ? result.products
                : [];


        renderFilters();

        renderStats();

        renderProducts();

    } catch (error) {

        console.error(
            error,
        );


        productsEl.innerHTML = `
            <div class="state">

                <div class="state-icon">
                    ⚠️
                </div>

                <div class="state-title">
                    Не удалось загрузить каталог
                </div>

                <div class="state-text">
                    ${escapeHtml(
                        error.message,
                    )}
                </div>

            </div>
        `;


        toast(
            error.message,
            true,
        );

    } finally {

        loading = false;

    }

}


/* ============================================================
   LOAD ADMINS
   ============================================================ */

async function loadAdmins() {

    adminsList.innerHTML = `
        <div class="admin-empty">

            <div class="admin-empty-icon">
                ⏳
            </div>

            <div class="admin-empty-title">
                Загружаем администраторов
            </div>

            <div class="admin-empty-text">
                Подождите немного...
            </div>

        </div>
    `;


    try {

        const result =
            await adminsApi(
                "GET",
            );


        admins =
            Array.isArray(
                result.admins,
            )
                ? result.admins
                : [];


        currentIsOwner =
            result.is_owner === true;


        if (!currentIsOwner) {

            adminPanel.innerHTML = `
                <div class="admin-panel-card">

                    <div class="admin-panel-title">
                        🔒 Управление администраторами
                    </div>

                    <div
                        class="admin-panel-description"
                        style="margin-top:8px"
                    >
                        Только владелец может добавлять
                        и удалять администраторов.
                    </div>

                </div>
            `;

            return;

        }


        renderAdmins();

    } catch (error) {

        console.error(
            error,
        );


        adminsList.innerHTML = `
            <div class="admin-empty">

                <div class="admin-empty-icon">
                    ⚠️
                </div>

                <div class="admin-empty-title">
                    Не удалось загрузить администраторов
                </div>

                <div class="admin-empty-text">
                    ${escapeHtml(
                        error.message,
                    )}
                </div>

            </div>
        `;


        toast(
            error.message,
            true,
        );

    }

}


/* ============================================================
   RENDER ADMINS
   ============================================================ */

function renderAdmins() {

    if (!admins.length) {

        adminsList.innerHTML = `
            <div class="admin-empty">

                <div class="admin-empty-icon">
                    👥
                </div>

                <div class="admin-empty-title">
                    Администраторов пока нет
                </div>

                <div class="admin-empty-text">
                    Добавьте первого администратора
                    выше.
                </div>

            </div>
        `;

        return;

    }


    adminsList.innerHTML =
        admins
            .map(
                admin => {

                    const owner =
                        admin.is_owner === true;


                    const telegramId =
                        String(
                            admin.telegram_id ?? "",
                        );


                    const created =
                        admin.created_at
                            ? formatDate(
                                admin.created_at,
                            )
                            : "";


                    return `
                        <div class="admin-item">

                            <div class="admin-info">

                                <div class="admin-name">

                                    ${
                                        owner
                                            ? "👑"
                                            : "👤"
                                    }

                                    <span>
                                        ${
                                            owner
                                                ? "Владелец"
                                                : "Администратор"
                                        }
                                    </span>

                                    <span
                                        class="admin-role ${
                                            owner
                                                ? "owner"
                                                : ""
                                        }"
                                    >
                                        ${
                                            owner
                                                ? "OWNER"
                                                : "ADMIN"
                                        }
                                    </span>

                                </div>

                                <div class="admin-telegram-id">
                                    Telegram ID:
                                    ${escapeHtml(
                                        telegramId,
                                    )}
                                </div>

                                ${
                                    created
                                        ? `
                                            <div class="admin-created">
                                                Добавлен:
                                                ${escapeHtml(
                                                    created,
                                                )}
                                            </div>
                                          `
                                        : ""
                                }

                            </div>


                            <button
                                type="button"
                                class="remove-admin-button"
                                data-remove-admin="${escapeAttr(
                                    telegramId,
                                )}"
                                title="${
                                    owner
                                        ? "Владельца нельзя удалить"
                                        : "Удалить администратора"
                                }"
                                ${
                                    owner
                                        ? "disabled"
                                        : ""
                                }
                            >
                                🗑
                            </button>

                        </div>
                    `;

                },
            )
            .join("");

}


/* ============================================================
   ADD ADMIN
   ============================================================ */

async function addAdmin() {

    if (!currentIsOwner) {

        toast(
            "Только владелец может добавлять администраторов",
            true,
        );

        return;

    }


    const telegramId =
        adminTelegramId.value.trim();


    if (!telegramId) {

        toast(
            "Введите Telegram ID",
            true,
        );

        return;

    }


    if (
        !/^\d+$/.test(
            telegramId,
        )
    ) {

        toast(
            "Telegram ID должен содержать только цифры",
            true,
        );

        return;

    }


    addAdminButton.disabled = true;

    addAdminButton.textContent =
        "Добавление...";


    try {

        await adminsApi(
            "POST",
            {
                telegram_id:
                    Number(
                        telegramId,
                    ),
            },
        );


        adminTelegramId.value =
            "";


        toast(
            "Администратор добавлен",
        );


        await loadAdmins();

    } catch (error) {

        console.error(
            error,
        );


        toast(
            error.message ||
            "Не удалось добавить администратора",
            true,
        );

    } finally {

        addAdminButton.disabled =
            false;

        addAdminButton.textContent =
            "+ Добавить";

    }

}


/* ============================================================
   DELETE ADMIN
   ============================================================ */

async function removeAdmin(
    telegramId,
) {

    if (!currentIsOwner) {

        toast(
            "Недостаточно прав",
            true,
        );

        return;

    }


    const admin =
        admins.find(
            item =>
                String(
                    item.telegram_id,
                ) ===
                String(
                    telegramId,
                ),
        );


    if (
        admin?.is_owner === true
    ) {

        toast(
            "Владельца удалить нельзя",
            true,
        );

        return;

    }


    const confirmed =
        confirm(
            `Удалить администратора с Telegram ID ${telegramId}?\n\nПосле удаления он больше не сможет управлять каталогом.`,
        );


    if (!confirmed) {
        return;
    }


    try {

        await adminsApi(
            "DELETE",
            null,
            telegramId,
        );


        toast(
            "Администратор удалён",
        );


        await loadAdmins();

    } catch (error) {

        console.error(
            error,
        );


        toast(
            error.message ||
            "Не удалось удалить администратора",
            true,
        );

    }

}


function placeMenu(){ /* Меню всегда находится в общей верхней строке */ }

/* ============================================================
   SWITCH PANELS
   ============================================================ */

function showCatalog() {
    hideHome?.();

    placeMenu(document.getElementById("catalogMenuSlot"));

    catalogPanel.classList.remove(
        "hidden",
    );

    adminPanel.classList.remove(
        "open",
    );

    catalogNavButton.classList.add(
        "active",
    );

    adminsNavButton.classList.remove(
        "active",
    );

}


function showAdmins() {
    hideHome?.();

    placeMenu(document.getElementById("adminsMenuSlot"));

    catalogPanel.classList.add(
        "hidden",
    );

    adminPanel.classList.add(
        "open",
    );

    catalogNavButton.classList.remove(
        "active",
    );

    adminsNavButton.classList.add(
        "active",
    );


    loadAdmins();

}


/* ============================================================
   FILTERS
   ============================================================ */

function renderFilters() {

    const categories = [

        "Все",

        ...new Set(
            products
                .map(
                    product =>
                        product.category,
                )
                .filter(Boolean),
        ),

    ];


    if (
        !categories.includes(
            activeCategory,
        )
    ) {

        activeCategory =
            "Все";

    }


    filtersEl.innerHTML =
        categories
            .map(
                category => `
                    <button
                        type="button"
                        class="filter ${
                            category === activeCategory
                                ? "active"
                                : ""
                        }"
                        data-category="${escapeAttr(
                            category,
                        )}"
                    >
                        ${escapeHtml(
                            category,
                        )}
                    </button>
                `,
            )
            .join("");

}


/* ============================================================
   STATS
   ============================================================ */

function renderStats() {

    const total =
        products.length;


    const stock =
        products.filter(
            product =>
                product.in_stock,
        ).length;


    const out =
        total - stock;


    totalCountEl.textContent =
        total;


    stockCountEl.textContent =
        stock;


    outCountEl.textContent =
        out;

}


/* ============================================================
   FILTERED PRODUCTS
   ============================================================ */

function getFilteredProducts() {

    const query =
        searchEl.value
            .trim()
            .toLowerCase();


    return products.filter(
        product => {

            const categoryMatch =
                activeCategory === "Все" ||
                product.category ===
                    activeCategory;


            const searchMatch =
                !query ||

                String(
                    product.name || "",
                )
                    .toLowerCase()
                    .includes(
                        query,
                    ) ||

                String(
                    product.description || "",
                )
                    .toLowerCase()
                    .includes(
                        query,
                    ) ||

                String(
                    product.category || "",
                )
                    .toLowerCase()
                    .includes(
                        query,
                    );


            return (
                categoryMatch &&
                searchMatch
            );

        },
    );

}


/* ============================================================
   RENDER PRODUCTS
   ============================================================ */

function renderProducts() {

    const filtered =
        getFilteredProducts();


    if (!filtered.length) {

        productsEl.innerHTML = `
            <div class="state">

                <div class="state-icon">
                    🍰
                </div>

                <div class="state-title">
                    Товаров пока нет
                </div>

                <div class="state-text">
                    Добавьте первый товар в каталог.
                </div>

            </div>
        `;

        return;

    }


    productsEl.innerHTML =
        filtered
            .map(
                product =>
                    productCard(
                        product,
                    ),
            )
            .join("");

}


/* ============================================================
   PRODUCT CARD
   ============================================================ */

function productCard(
    product,
) {

    const image =
        product.image_url
            ? `
                <img
                    src="${escapeAttr(
                        product.image_url,
                    )}"
                    alt=""
                    loading="lazy"
                    onerror="
                        this.style.display='none';
                    "
                >
              `
            : "🍰";


    const stockBadge =
        product.in_stock
            ? `
                <span class="badge badge-stock">
                    ● В наличии
                </span>
              `
            : `
                <span class="badge badge-out">
                    ● Нет в наличии
                </span>
              `;


    const category =
        product.category
            ? `
                <span class="badge badge-category">
                    ${escapeHtml(
                        product.category,
                    )}
                </span>
              `
            : "";


    const tag =
        product.tag
            ? `
                <span class="badge badge-tag">
                    ${escapeHtml(
                        product.tag,
                    )}
                </span>
              `
            : "";


    const description =
        product.description
            ? escapeHtml(
                product.description,
            )
            : "Описание отсутствует";


    return `
        <article
            class="product"
            data-id="${escapeAttr(
                product.id,
            )}"
        >

            <div class="product-image">
                ${image}
            </div>


            <div class="product-content">

                <div class="product-name">
                    ${escapeHtml(
                        product.name,
                    )}
                </div>


                <div class="product-description">
                    ${description}
                </div>


                <div class="product-meta">

                    <span class="price">
                        ${formatPrice(
                            product.price,
                        )}
                    </span>

                    ${stockBadge}

                    ${category}

                    ${tag}

                </div>

            </div>


            <div class="product-actions">

                <button
                    type="button"
                    class="icon-button"
                    title="Изменить"
                    data-action="edit"
                    data-id="${escapeAttr(
                        product.id,
                    )}"
                >
                    ✏️
                </button>


                <button
                    type="button"
                    class="icon-button"
                    title="${
                        product.in_stock
                            ? "Убрать из наличия"
                            : "Вернуть в наличие"
                    }"
                    data-action="stock"
                    data-id="${escapeAttr(
                        product.id,
                    )}"
                >
                    ${
                        product.in_stock
                            ? "📦"
                            : "🔄"
                    }
                </button>


                <button
                    type="button"
                    class="icon-button danger"
                    title="Удалить"
                    data-action="delete"
                    data-id="${escapeAttr(
                        product.id,
                    )}"
                >
                    🗑
                </button>

            </div>

        </article>
    `;

}


/* ============================================================
   CREATE MODAL
   ============================================================ */

function openCreateModal() {

    editingId = null;


    modalTitle.textContent =
        "Новый товар";


    form.reset();


    document.getElementById(
        "productId",
    ).value = "";


    document.getElementById(
        "inStock",
    ).checked = true;


    document.getElementById(
        "sortOrder",
    ).value = "0";


    document.getElementById(
        "imageUrl",
    ).value = "";


    imageFileEl.value = "";


    imagePreview.classList.remove(
        "show",
    );


    imagePreviewImg.src =
        "";


    currentImage.classList.remove(
        "show",
    );


    currentImageImg.src =
        "";


    modal.classList.add(
        "open",
    );

}


/* ============================================================
   EDIT MODAL
   ============================================================ */

function openEditModal(
    product,
) {

    editingId =
        product.id;


    modalTitle.textContent =
        "Редактирование товара";


    document.getElementById(
        "productId",
    ).value =
        product.id || "";


    document.getElementById(
        "name",
    ).value =
        product.name || "";


    document.getElementById(
        "category",
    ).value =
        product.category || "";


    document.getElementById(
        "price",
    ).value =
        product.price ?? "";


    document.getElementById(
        "weight",
    ).value =
        product.weight || "";


    document.getElementById(
        "description",
    ).value =
        product.description || "";


    document.getElementById(
        "imageUrl",
    ).value =
        product.image_url || "";


    document.getElementById(
        "tag",
    ).value =
        product.tag || "";


    document.getElementById(
        "sortOrder",
    ).value =
        product.sort_order ?? 0;


    document.getElementById(
        "inStock",
    ).checked =
        product.in_stock !== false;


    imageFileEl.value = "";


    imagePreview.classList.remove(
        "show",
    );


    imagePreviewImg.src =
        "";


    if (
        product.image_url
    ) {

        currentImage.classList.add(
            "show",
        );


        currentImageImg.src =
            product.image_url;

    } else {

        currentImage.classList.remove(
            "show",
        );


        currentImageImg.src =
            "";

    }


    modal.classList.add(
        "open",
    );

}


/* ============================================================
   CLOSE MODAL
   ============================================================ */

function closeModal() {

    modal.classList.remove(
        "open",
    );


    editingId = null;

}


/* ============================================================
   SAVE PRODUCT
   ============================================================ */

async function saveProduct() {

    const saveButton =
        document.getElementById(
            "saveButton",
        );


    const name =
        document.getElementById(
            "name",
        ).value.trim();


    const price =
        Number(
            document.getElementById(
                "price",
            ).value,
        );


    if (!name) {

        toast(
            "Введите название товара",
            true,
        );

        return;

    }


    if (
        !Number.isFinite(price) ||
        price < 0
    ) {

        toast(
            "Введите корректную цену",
            true,
        );

        return;

    }


    saveButton.disabled =
        true;


    try {

        const imageFile =
            imageFileEl.files?.[0];


        let uploadedImageUrl =
            null;


        if (imageFile) {

            saveButton.textContent =
                "Загрузка фото...";


            uploadedImageUrl =
                await uploadProductImage(
                    imageFile,
                );

        }


        const oldImageUrl =
            document.getElementById(
                "imageUrl",
            ).value.trim();


        const product = {

            name,

            category:
                document.getElementById(
                    "category",
                ).value.trim() || null,

            price,

            weight:
                document.getElementById(
                    "weight",
                ).value.trim() || null,

            description:
                document.getElementById(
                    "description",
                ).value.trim() || null,

            image_url:
                uploadedImageUrl ||
                oldImageUrl ||
                null,

            tag:
                document.getElementById(
                    "tag",
                ).value.trim() || null,

            sort_order:
                Number(
                    document.getElementById(
                        "sortOrder",
                    ).value || 0,
                ),

            in_stock:
                document.getElementById(
                    "inStock",
                ).checked,

        };


        saveButton.textContent =
            "Сохранение...";


        if (editingId) {

            await api(
                "PUT",
                product,
                editingId,
            );


            toast(
                "Товар изменён",
            );

        } else {

            await api(
                "POST",
                product,
            );


            toast(
                "Товар добавлен",
            );

        }


        closeModal();


        await loadProducts();

    } catch (error) {

        console.error(
            error,
        );


        toast(
            error.message ||
            "Не удалось сохранить товар",
            true,
        );

    } finally {

        saveButton.disabled =
            false;

        saveButton.textContent =
            "Сохранить";

    }

}


/* ============================================================
   DELETE PRODUCT
   ============================================================ */

async function deleteProduct(
    product,
) {

    const confirmed =
        confirm(
            `Удалить товар «${product.name}»?\n\nЭто действие нельзя отменить.`,
        );


    if (!confirmed) {
        return;
    }


    try {

        await api(
            "DELETE",
            null,
            product.id,
        );


        toast(
            "Товар удалён",
        );


        await loadProducts();

    } catch (error) {

        console.error(
            error,
        );


        toast(
            error.message,
            true,
        );

    }

}


/* ============================================================
   TOGGLE STOCK
   ============================================================ */

async function toggleStock(
    product,
) {

    try {

        await api(
            "PUT",
            {

                name:
                    product.name,

                category:
                    product.category ||
                    null,

                description:
                    product.description ||
                    null,

                weight:
                    product.weight ||
                    null,

                price:
                    Number(
                        product.price || 0,
                    ),

                image_url:
                    product.image_url ||
                    null,

                tag:
                    product.tag ||
                    null,

                in_stock:
                    !product.in_stock,

                sort_order:
                    Number(
                        product.sort_order ||
                        0,
                    ),

            },
            product.id,
        );


        toast(
            product.in_stock
                ? "Товар убран из наличия"
                : "Товар снова в наличии",
        );


        await loadProducts();

    } catch (error) {

        console.error(
            error,
        );


        toast(
            error.message,
            true,
        );

    }

}


/* ============================================================
   IMAGE PREVIEW
   ============================================================ */

imageFileEl.addEventListener(
    "change",
    () => {

        const file =
            imageFileEl.files?.[0];


        if (!file) {

            imagePreview.classList.remove(
                "show",
            );

            imagePreviewImg.src =
                "";

            return;

        }


        if (
            file.size >
            10 * 1024 * 1024
        ) {

            toast(
                "Изображение не должно быть больше 10 MB",
                true,
            );


            imageFileEl.value =
                "";


            imagePreview.classList.remove(
                "show",
            );


            return;

        }


        const allowedTypes = [

            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",

        ];


        if (
            !allowedTypes.includes(
                file.type,
            )
        ) {

            toast(
                "Разрешены JPG, PNG, WEBP и GIF",
                true,
            );


            imageFileEl.value =
                "";


            imagePreview.classList.remove(
                "show",
            );


            return;

        }


        const url =
            URL.createObjectURL(
                file,
            );


        imagePreviewImg.src =
            url;


        imagePreview.classList.add(
            "show",
        );

    },
);


/* ============================================================
   NAV EVENTS
   ============================================================ */

/* ============================================================
   ADMIN FORM
   ============================================================ */

addAdminForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        addAdmin();

    },
);


/* ============================================================
   ADMIN LIST EVENTS
   ============================================================ */

adminsList.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-remove-admin]",
            );


        if (!button) {
            return;
        }


        const telegramId =
            button.dataset.removeAdmin;


        if (!telegramId) {
            return;
        }


        removeAdmin(
            telegramId,
        );

    },
);


/* ============================================================
   PRODUCT EVENTS
   ============================================================ */

document
    .getElementById(
        "addButton",
    )
    .addEventListener(
        "click",
        openCreateModal,
    );


document
    .getElementById(
        "closeButton",
    )
    .addEventListener(
        "click",
        closeModal,
    );


document
    .getElementById(
        "cancelButton",
    )
    .addEventListener(
        "click",
        closeModal,
    );


form.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        saveProduct();

    },
);


searchEl.addEventListener(
    "input",
    renderProducts,
);


filtersEl.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".filter",
            );


        if (!button) {
            return;
        }


        activeCategory =
            button.dataset.category ||
            "Все";


        renderFilters();

        renderProducts();

    },
);


productsEl.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-action]",
            );


        if (!button) {
            return;
        }


        const id =
            button.dataset.id;


        const product =
            products.find(
                item =>
                    String(item.id) ===
                    String(id),
            );


        if (!product) {
            return;
        }


        const action =
            button.dataset.action;


        if (
            action === "edit"
        ) {

            openEditModal(
                product,
            );

        }


        if (
            action === "delete"
        ) {

            deleteProduct(
                product,
            );

        }


        if (
            action === "stock"
        ) {

            toggleStock(
                product,
            );

        }

    },
);


/* ============================================================
   MODAL BACKDROP
   ============================================================ */

modal.addEventListener(
    "click",
    event => {

        if (
            event.target === modal
        ) {

            closeModal();

        }

    },
);


/* ============================================================
   ESCAPE
   ============================================================ */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            modal.classList.contains(
                "open",
            )
        ) {

            closeModal();

        }

    },
);


/* ============================================================
   HELPERS
   ============================================================ */

function formatPrice(
    value,
) {

    return (
        Number(
            value || 0,
        )
            .toLocaleString(
                "ru-RU",
                {
                    maximumFractionDigits: 2,
                },
            ) +
        " ₽"
    );

}


function formatDate(
    value,
) {

    try {

        return new Date(
            value,
        ).toLocaleString(
            "ru-RU",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            },
        );

    } catch {

        return String(
            value,
        );

    }

}


function escapeHtml(
    value,
) {

    return String(
        value ?? "",
    )
        .replace(
            /&/g,
            "&amp;",
        )
        .replace(
            /</g,
            "&lt;",
        )
        .replace(
            />/g,
            "&gt;",
        )
        .replace(
            /"/g,
            "&quot;",
        )
        .replace(
            /'/g,
            "&#039;",
        );

}


function escapeAttr(
    value,
) {

    return escapeHtml(
        value,
    );

}



/* ============================================================
   MALINA PROMOTIONS / PROMO CODES / ORDERS MANAGEMENT
   ============================================================ */
const MANAGEMENT_API_URL = "https://xheusnpmmmhbwwfcozbr.supabase.co/functions/v1/admin-management";
const promotionsPanel = document.getElementById("promotionsPanel");
const promoCodesPanel = document.getElementById("promoCodesPanel");
const ordersPanel = document.getElementById("ordersPanel");
const promotionsList = document.getElementById("promotionsList");
const promoCodesList = document.getElementById("promoCodesList");
const ordersList = document.getElementById("ordersList");
const promotionModal = document.getElementById("promotionModal");
const promoCodeModal = document.getElementById("promoCodeModal");
let managementProducts = [], managementPromotions = [], managementPromoCodes = [], managementOrders = [];

async function managementApi(resource, method="GET", body=null, id=null){
  const url=new URL(MANAGEMENT_API_URL); url.searchParams.set("resource",resource); if(id) url.searchParams.set("id",id);
  const r=await fetch(url,{method,headers:{"Content-Type":"application/json","X-Telegram-Init-Data":getTelegramInitData()},body:body?JSON.stringify(body):undefined});
  const text=await r.text(); let data={}; try{data=text?JSON.parse(text):{}}catch{throw new Error(text||`HTTP ${r.status}`)}
  if(!r.ok||data.ok===false) throw new Error(data.error||`HTTP ${r.status}`); return data;
}
function setActiveNav(btn){document.querySelectorAll(".admin-nav .nav-button").forEach(x=>x.classList.remove("active")); if(btn)btn.classList.add("active");}
function hideExtraPanels(){promotionsPanel.hidden=true;promoCodesPanel.hidden=true;ordersPanel.hidden=true;catalogPanel.classList.remove("hidden");adminPanel.classList.remove("open");}
function showManagementPanel(panel,btn){
  hideHome?.();const slots={promotionsPanel:"promotionsMenuSlot",promoCodesPanel:"promoCodesMenuSlot",ordersPanel:"ordersMenuSlot"};placeMenu(document.getElementById(slots[panel.id]));catalogPanel.classList.add("hidden");adminPanel.classList.remove("open");promotionsPanel.hidden=true;promoCodesPanel.hidden=true;ordersPanel.hidden=true;panel.hidden=false;setActiveNav(btn);}
function fmtDateTime(v){if(!v)return "Без ограничения";const d=new Date(v);return Number.isNaN(d.getTime())?"—":d.toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}
function toLocalInput(v){if(!v)return "";const d=new Date(v);if(Number.isNaN(d.getTime()))return "";const z=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`}
function localToIso(v,endOfDay=false){if(!v)return null;const d=new Date(`${v}T${endOfDay?"23:59:59":"00:00:00"}`);return Number.isNaN(d.getTime())?null:d.toISOString()}
function promotionTypeLabel(t){return ({product_discount:"На товар",category_discount:"На категорию",order_discount:"На весь заказ",bogo:"2 + 1",second_item_discount:"На второй товар",free_delivery:"Бесплатная доставка",delivery_discount:"Скидка на доставку",delivery_price:"Доставка за фиксированную цену"})[t]||t}
function promotionDiscountLabel(p){if(p.promotion_type==="free_delivery")return "Доставка бесплатно";if(p.promotion_type==="delivery_discount")return p.discount_type==="fixed"?`−${formatPrice(p.discount_value)} доставки`:`−${p.discount_value}% доставки`;if(p.promotion_type==="delivery_price")return `Доставка ${formatPrice(p.discount_value)}`;if(p.promotion_type==="bogo")return `${p.buy_quantity||2}+${p.reward_quantity||1}`;if(p.promotion_type==="second_item_discount")return `Второй −${p.reward_discount_percent??50}%`;return p.discount_type==="fixed"?`−${formatPrice(p.discount_value)}`:`−${p.discount_value}%`}
async function loadManagementProducts(){try{const r=await managementApi("products");managementProducts=r.products||[];refreshPromotionCategories();const s=document.getElementById("promotionProduct");s.innerHTML='<option value="">Выберите товар</option>'+managementProducts.map(p=>`<option value="${escapeAttr(p.id)}">${escapeHtml(p.name)} · ${formatPrice(p.price)}</option>`).join("")}catch(e){console.warn(e)}}
async function loadPromotions(){promotionsList.innerHTML='<div class="state"><div class="state-icon">⏳</div><div class="state-title">Загружаем акции…</div></div>';try{const r=await managementApi("promotions");managementPromotions=r.promotions||[];renderPromotions()}catch(e){promotionsList.innerHTML=`<div class="state"><div class="state-icon">⚠️</div><div class="state-title">Не удалось загрузить акции</div><div class="state-text">${escapeHtml(e.message)}</div></div>`;toast(e.message,true)}}
function renderPromotions(){if(!managementPromotions.length){promotionsList.innerHTML='<div class="state"><div class="state-icon">🔥</div><div class="state-title">Акций пока нет</div><div class="state-text">Создайте первую акцию — она начнёт применяться автоматически после сохранения.</div></div>';return}promotionsList.innerHTML=managementPromotions.map(p=>{const target=p.target_product_id?` · ${escapeHtml(managementProducts.find(x=>String(x.id)===String(p.target_product_id))?.name||"Товар")}`:(p.target_category?` · ${escapeHtml(p.target_category)}`:"");const dates=(p.starts_at||p.expires_at)?`${fmtDateTime(p.starts_at)} → ${fmtDateTime(p.expires_at)}`:"Без ограничения по датам";return `<div class="promo-card"><div class="promo-card-head"><div><div class="promo-card-title">${escapeHtml(p.name)} ${p.badge?`<span class="discount-pill">${escapeHtml(p.badge)}</span>`:""}</div><div class="promo-meta"><strong>${escapeHtml(promotionTypeLabel(p.promotion_type))}</strong> · ${escapeHtml(promotionDiscountLabel(p))}${target}<br>${p.min_order_amount>0?`От ${formatPrice(p.min_order_amount)} · `:""}${dates}</div></div><div class="promo-actions"><button class="mini-button" title="Изменить" data-edit-promo="${p.id}">✏️</button><button class="mini-button danger" title="Удалить" data-delete-promo="${p.id}">🗑</button></div></div><div style="margin-top:10px"><span class="status-pill ${p.is_active?'':'off'}">${p.is_active?'ВКЛЮЧЕНА':'ВЫКЛЮЧЕНА'}</span></div></div>`}).join("")}
function refreshPromotionCategories(selected=""){
  const s=document.getElementById("promotionCategory");
  if(!s) return;
  const categories=[...new Set((managementProducts||[]).map(p=>String(p.category||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ru"));
  s.innerHTML='<option value="">Выберите категорию</option>'+categories.map(c=>`<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("");
  if(selected) s.value=selected;
  syncPromotionCategoryVisual();
}
function syncPromotionCategoryVisual(){
  const select=document.getElementById("promotionCategory");
  const field=document.getElementById("promotionCategoryField");
  if(!select||!field)return;
  field.classList.toggle("has-selection",!!select.value);
}
function setOptionalField(key,on=true){
  const map={min:"promotionMinOrderField",max:"promotionMaxDiscountField",badge:"promotionBadgeField",stack:"promotionStackField"};
  const el=document.getElementById(map[key]); const btn=document.querySelector(`[data-optional="${key}"]`);
  if(!el) return; el.classList.toggle("hidden-field",!on); if(btn) btn.classList.toggle("active",on);
}
function syncPromotionOptionalButtons(p=null){
  const hasMin=p ? Number(p.min_order_amount||0)>0 : false;
  const hasMax=p ? p.max_discount!==null && p.max_discount!==undefined && p.max_discount!=="" : false;
  const hasBadge=p ? !!p.badge : false;
  const hasStack=p ? p.stackable_with_promo_code===true : false;
  setOptionalField("min",hasMin); setOptionalField("max",hasMax); setOptionalField("badge",hasBadge); setOptionalField("stack",hasStack);
  const stack=document.getElementById("promotionStack"); if(stack) stack.checked=hasStack;
}
function syncPromotionUI(){
  const type=document.getElementById("promotionType").value;
  const show=(id,on)=>document.getElementById(id).classList.toggle("hidden-field",!on);
  show("promotionProductField",["product_discount","second_item_discount","bogo"].includes(type));
  show("promotionCategoryField",["category_discount","second_item_discount","bogo"].includes(type));
  show("promotionDiscountTypeField",["product_discount","category_discount","order_discount","delivery_discount"].includes(type));
  show("promotionBuyField",["bogo","second_item_discount"].includes(type));
  show("promotionRewardField",type==="bogo");
  show("promotionRewardDiscountField",type==="second_item_discount");
  show("promotionDeliveryPriceField",type==="delivery_price");
  if(type==="free_delivery" || type==="delivery_price") document.getElementById("promotionValue").value=0;
  if(type==="delivery_price") document.getElementById("promotionDiscountType").value="fixed";
  refreshPromotionCategories(document.getElementById("promotionCategory").value);
  if(["delivery_discount","free_delivery","delivery_price"].includes(type)) document.getElementById("promotionProduct").value="";
}
function openPromotion(p=null){
  document.getElementById("promotionModalTitle").textContent=p?"Изменить акцию":"Новая акция";
  document.getElementById("promotionId").value=p?.id||"";
  document.getElementById("promotionName").value=p?.name||"";
  document.getElementById("promotionType").value=p?.promotion_type||"product_discount";
  document.getElementById("promotionValue").value=p?.discount_value??20;
  document.getElementById("promotionDiscountType").value=p?.discount_type||"percent";
  document.getElementById("promotionProduct").value=p?.target_product_id||"";
  refreshPromotionCategories(p?.target_category||"");
  document.getElementById("promotionMinOrder").value=p?.min_order_amount??0;
  document.getElementById("promotionMaxDiscount").value=p?.max_discount??"";
  document.getElementById("promotionBuyQty").value=p?.buy_quantity??2;
  document.getElementById("promotionRewardQty").value=p?.reward_quantity??1;
  document.getElementById("promotionRewardDiscount").value=p?.reward_discount_percent??100;
  document.getElementById("promotionDeliveryPrice").value=(p?.promotion_type==="delivery_price"?p?.discount_value:100)??100;
  document.getElementById("promotionStartsAt").value=toLocalInput(p?.starts_at);
  document.getElementById("promotionExpiresAt").value=toLocalInput(p?.expires_at);
  document.getElementById("promotionBadge").value=p?.badge||"";
  document.getElementById("promotionActive").checked=p?.is_active!==false;
  syncPromotionUI(); syncPromotionOptionalButtons(p);
  promotionModal.classList.add("open");
}
function closePromotion(){promotionModal.classList.remove("open")}
async function savePromotionForm(e){
  e.preventDefault();
  const type=document.getElementById("promotionType").value;
  const minOn=!document.getElementById("promotionMinOrderField").classList.contains("hidden-field");
  const maxOn=!document.getElementById("promotionMaxDiscountField").classList.contains("hidden-field");
  const badgeOn=!document.getElementById("promotionBadgeField").classList.contains("hidden-field");
  const stackOn=!document.getElementById("promotionStackField").classList.contains("hidden-field");
  const body={name:document.getElementById("promotionName").value.trim(),promotion_type:type,discount_type:document.getElementById("promotionDiscountType").value,discount_value:Number(document.getElementById("promotionValue").value||0),target_product_id:document.getElementById("promotionProduct").value||null,target_category:document.getElementById("promotionCategory").value||null,min_order_amount:minOn?Number(document.getElementById("promotionMinOrder").value||0):0,max_discount:maxOn&&document.getElementById("promotionMaxDiscount").value!==""?Number(document.getElementById("promotionMaxDiscount").value):null,buy_quantity:["bogo","second_item_discount"].includes(type)?Number(document.getElementById("promotionBuyQty").value||2):null,reward_quantity:type==="bogo"?Number(document.getElementById("promotionRewardQty").value||1):null,reward_discount_percent:type==="second_item_discount"?Number(document.getElementById("promotionRewardDiscount").value||50):null,starts_at:localToIso(document.getElementById("promotionStartsAt").value),expires_at:localToIso(document.getElementById("promotionExpiresAt").value,true),badge:badgeOn?document.getElementById("promotionBadge").value.trim()||null:null,stackable_with_promo_code:stackOn && document.getElementById("promotionStack")?.checked===true,is_active:document.getElementById("promotionActive").checked};
  if(type==="delivery_price"){body.discount_type="fixed";body.discount_value=Number(document.getElementById("promotionDeliveryPrice").value||0);}
  if(!body.name){toast("Введите название акции",true);return}
  if(type==="category_discount"&&!body.target_category){toast("Выберите категорию",true);return}
  if(["product_discount","second_item_discount","bogo"].includes(type)&&!body.target_product_id&&!body.target_category){toast("Выберите товар или категорию",true);return}
  try{const id=document.getElementById("promotionId").value;await managementApi("promotions",id?"PATCH":"POST",body,id||null);closePromotion();toast(id?"Акция изменена":"Акция создана");await loadPromotions()}catch(err){toast(err.message,true)}
}
document.getElementById("promotionCategory")?.addEventListener("change",syncPromotionCategoryVisual);
document.addEventListener("click",e=>{const b=e.target.closest("[data-optional]");if(!b)return;const key=b.dataset.optional;const map={min:"promotionMinOrderField",max:"promotionMaxDiscountField",badge:"promotionBadgeField",stack:"promotionStackField"};const el=document.getElementById(map[key]);if(!el)return;const on=el.classList.contains("hidden-field");setOptionalField(key,on);});
async function deletePromotionById(id){if(!confirm("Удалить эту акцию?"))return;try{await managementApi("promotions","DELETE",null,id);toast("Акция удалена");await loadPromotions()}catch(e){toast(e.message,true)}}
async function loadPromoCodes(){promoCodesList.innerHTML='<div class="state"><div class="state-icon">⏳</div><div class="state-title">Загружаем промокоды…</div></div>';try{const r=await managementApi("promo_codes");managementPromoCodes=r.promo_codes||[];renderPromoCodes()}catch(e){promoCodesList.innerHTML=`<div class="state"><div class="state-icon">⚠️</div><div class="state-title">Ошибка</div><div class="state-text">${escapeHtml(e.message)}</div></div>`;toast(e.message,true)}}
function renderPromoCodes(){if(!managementPromoCodes.length){promoCodesList.innerHTML='<div class="state"><div class="state-icon">🏷️</div><div class="state-title">Промокодов пока нет</div><div class="state-text">Создайте первый код для специального предложения.</div></div>';return}promoCodesList.innerHTML=managementPromoCodes.map(p=>{const dates=(p.starts_at||p.expires_at)?`${fmtDateTime(p.starts_at)} → ${fmtDateTime(p.expires_at)}`:"Без ограничения по датам";return `<div class="promo-card"><div class="promo-card-head"><div><div class="promo-card-title">${escapeHtml(p.code)} <span class="discount-pill">${p.discount_type==='fixed'?`−${formatPrice(p.discount_value)}`:`−${p.discount_value}%`}</span></div><div class="promo-meta">${p.min_order_amount>0?`От ${formatPrice(p.min_order_amount)} · `:"Без минимальной суммы"}${p.usage_limit?`Использовано ${p.usage_count||0}/${p.usage_limit}`:"Без лимита использований"}<br>${dates}${p.one_use_per_user?' · 1 раз на пользователя':''}</div></div><div class="promo-actions"><button class="mini-button" title="Изменить" data-edit-code="${p.id}">✏️</button><button class="mini-button danger" title="Удалить" data-delete-code="${p.id}">🗑</button></div></div><div style="margin-top:10px"><span class="status-pill ${p.is_active?'':'off'}">${p.is_active?'ВКЛЮЧЕН':'ВЫКЛЮЧЕН'}</span></div></div>`}).join("")}
function openPromoCode(p=null){document.getElementById("promoCodeModalTitle").textContent=p?"Изменить промокод":"Новый промокод";document.getElementById("promoCodeId").value=p?.id||"";document.getElementById("promoCodeValue").value=p?.code||"";document.getElementById("promoCodeDiscountValue").value=p?.discount_value??10;document.getElementById("promoCodeDiscountType").value=p?.discount_type||"percent";document.getElementById("promoCodeMinOrder").value=p?.min_order_amount??0;document.getElementById("promoCodeMaxDiscount").value=p?.max_discount??"";document.getElementById("promoCodeUsageLimit").value=p?.usage_limit??"";document.getElementById("promoCodeStartsAt").value=toLocalInput(p?.starts_at);document.getElementById("promoCodeExpiresAt").value=toLocalInput(p?.expires_at);document.getElementById("promoCodeActive").checked=p?.is_active!==false;document.getElementById("promoCodeOneUse").checked=p?.one_use_per_user===true;promoCodeModal.classList.add("open")}
function closePromoCode(){promoCodeModal.classList.remove("open")}
async function savePromoCodeForm(e){e.preventDefault();const code=document.getElementById("promoCodeValue").value.trim().toUpperCase();const value=Number(document.getElementById("promoCodeDiscountValue").value||0);if(!code||value<=0){toast("Введите код и размер скидки",true);return}const id=document.getElementById("promoCodeId").value;const body={code,discount_value:value,discount_type:document.getElementById("promoCodeDiscountType").value,min_order_amount:Number(document.getElementById("promoCodeMinOrder").value||0),max_discount:document.getElementById("promoCodeMaxDiscount").value===""?null:Number(document.getElementById("promoCodeMaxDiscount").value),usage_limit:document.getElementById("promoCodeUsageLimit").value===""?null:Number(document.getElementById("promoCodeUsageLimit").value),starts_at:localToIso(document.getElementById("promoCodeStartsAt").value),expires_at:localToIso(document.getElementById("promoCodeExpiresAt").value,true),is_active:document.getElementById("promoCodeActive").checked,one_use_per_user:document.getElementById("promoCodeOneUse").checked};try{await managementApi("promo_codes",id?"PATCH":"POST",body,id||null);closePromoCode();toast(id?"Промокод изменён":"Промокод создан");await loadPromoCodes()}catch(err){toast(err.message,true)}}
async function deletePromoCodeById(id){if(!confirm("Удалить этот промокод?"))return;try{await managementApi("promo_codes","DELETE",null,id);toast("Промокод удалён");await loadPromoCodes()}catch(e){toast(e.message,true)}}
async function loadOrders(){ordersList.innerHTML='<div class="state"><div class="state-icon">⏳</div><div class="state-title">Загружаем заказы…</div></div>';try{const r=await managementApi("orders");managementOrders=r.orders||[];renderOrders()}catch(e){ordersList.innerHTML=`<div class="state"><div class="state-icon">⚠️</div><div class="state-title">Не удалось загрузить заказы</div><div class="state-text">${escapeHtml(e.message)}</div></div>`;toast(e.message,true)}}
const ORDER_STATUS_LABELS={new:"Новый",confirmed:"Подтверждён",completed:"Выполнен",cancelled:"Отменён"};
function renderOrders(){
  if(!managementOrders.length){
    ordersList.innerHTML='<div class="state"><div class="state-icon">📦</div><div class="state-title">Заказов пока нет</div></div>';
    return;
  }
  ordersList.innerHTML=managementOrders.map(o=>{
    const items=Array.isArray(o.items)?o.items:[];
    const promos=Array.isArray(o.promotions)?o.promotions:[];
    const tg=o.telegram_username?`@${escapeHtml(String(o.telegram_username).replace(/^@/,''))}`:'Не указан';
    const itemRows=items.length?items.map(i=>`<div class="order-item-row"><div class="order-item-main"><span class="order-item-name">${escapeHtml(i.product_name||'Товар')}</span><span class="order-item-qty">${Number(i.quantity)||0} × ${formatPrice(i.price)}</span></div><span class="order-item-sum">${formatPrice(i.subtotal)}</span></div>`).join(''):'<div class="order-empty-inline">Состав заказа не найден</div>';
    const promoRows=promos.map(p=>`<div class="order-discount-row"><span>🔥 ${escapeHtml(p.promotion_name||'Акция')}</span><strong>${Number(p.discount||0)>0?`−${formatPrice(p.discount)}`:'Применена'}</strong></div>`).join('');
    const promoCode=o.promo_code?`<div class="order-discount-row"><span>🏷️ Промокод <b>${escapeHtml(o.promo_code)}</b></span><strong>−${formatPrice(o.discount||0)}</strong></div>`:'';
    const totalDiscount=Number(o.discount||0);
    return `<article class="order-card">
      <div class="order-card-top">
        <div>
          <div class="order-number">Заказ №${escapeHtml(o.order_number||'—')} <span class="status-pill ${o.status==='cancelled'?'off':''}">${escapeHtml(ORDER_STATUS_LABELS[o.status]||o.status)}</span></div>
          <div class="order-created">${fmtDateTime(o.created_at)}</div>
        </div>
        <div class="order-total">${formatPrice(o.total)}</div>
      </div>
      <div class="order-section">
        <div class="order-section-title">Клиент</div>
        <div class="order-lines">
          <div><span>Имя</span><strong>${escapeHtml(o.customer_name||'Не указано')}</strong></div>
          <div><span>Телефон</span><strong>${escapeHtml(o.phone||'Не указан')}</strong></div>
          <div><span>Telegram</span><strong>${tg}</strong></div>
          <div><span>Получение</span><strong>${escapeHtml(o.method||'—')}</strong></div>
          ${o.address?`<div><span>Адрес</span><strong>${escapeHtml(o.address)}</strong></div>`:''}
          ${o.pickup_date?`<div><span>Дата</span><strong>${escapeHtml(o.pickup_date)}</strong></div>`:''}
          ${o.comment?`<div><span>Комментарий</span><strong>${escapeHtml(o.comment)}</strong></div>`:''}
        </div>
      </div>
      <div class="order-section">
        <div class="order-section-title">Состав заказа</div>
        <div class="order-items">${itemRows}</div>
      </div>
      ${(promoRows||promoCode)||totalDiscount>0?`<div class="order-section"><div class="order-section-title">Скидки</div><div class="order-discounts">${promoRows}${promoCode}${!promoRows&&!promoCode&&totalDiscount>0?`<div class="order-discount-row"><span>Скидка</span><strong>−${formatPrice(totalDiscount)}</strong></div>`:''}</div></div>`:''}
      <div class="order-section order-totals">
        <div><span>Товары</span><strong>${formatPrice(o.subtotal||0)}</strong></div>
        <div><span>Доставка</span><strong>${Number(o.delivery_fee||0)>0?formatPrice(o.delivery_fee):'Бесплатно'}</strong></div>
        ${totalDiscount>0?`<div class="total-discount"><span>Скидка</span><strong>−${formatPrice(totalDiscount)}</strong></div>`:''}
        <div class="order-grand-total"><span>Итого</span><strong>${formatPrice(o.total||0)}</strong></div>
      </div>
      <div class="order-actions"><select class="order-select" data-order-status="${o.id}"><option value="new" ${o.status==='new'?'selected':''}>Новый</option><option value="confirmed" ${o.status==='confirmed'?'selected':''}>Подтверждён</option><option value="completed" ${o.status==='completed'?'selected':''}>Выполнен</option><option value="cancelled" ${o.status==='cancelled'?'selected':''}>Отменён</option></select><button class="order-delete-btn" type="button" title="Удалить заказ" data-delete-order="${o.id}">Удалить заказ</button></div>
    </article>`;
  }).join('');
}

const promotionsNavButton=document.getElementById("promotionsNavButton"),promoCodesNavButton=document.getElementById("promoCodesNavButton"),ordersNavButton=document.getElementById("ordersNavButton");
catalogNavButton.addEventListener("click",()=>{hideExtraPanels();catalogPanel.classList.remove("hidden");setActiveNav(catalogNavButton)});
adminsNavButton.addEventListener("click",()=>{hideExtraPanels();catalogPanel.classList.add("hidden");adminPanel.classList.add("open");setActiveNav(adminsNavButton);loadAdmins()});
promotionsNavButton.addEventListener("click",()=>{showManagementPanel(promotionsPanel,promotionsNavButton);loadManagementProducts().then(loadPromotions)});
promoCodesNavButton.addEventListener("click",()=>{showManagementPanel(promoCodesPanel,promoCodesNavButton);loadPromoCodes()});
ordersNavButton.addEventListener("click",()=>{showManagementPanel(ordersPanel,ordersNavButton);loadOrders()});
document.getElementById("addPromotionButton").addEventListener("click",async()=>{if(!managementProducts.length)await loadManagementProducts();openPromotion()});
document.querySelectorAll("[data-promo-type]").forEach(b=>b.addEventListener("click",()=>{document.getElementById("promotionType").value=b.dataset.promoType;syncPromotionUI()}));
document.getElementById("closePromotionButton").addEventListener("click",closePromotion);document.getElementById("cancelPromotionButton").addEventListener("click",closePromotion);document.getElementById("promotionForm").addEventListener("submit",savePromotionForm);
promotionsList.addEventListener("click",e=>{const edit=e.target.closest("[data-edit-promo]"),del=e.target.closest("[data-delete-promo]");if(edit)openPromotion(managementPromotions.find(p=>String(p.id)===String(edit.dataset.editPromo)));if(del)deletePromotionById(del.dataset.deletePromo)});
document.getElementById("addPromoCodeButton").addEventListener("click",()=>openPromoCode());document.getElementById("closePromoCodeButton").addEventListener("click",closePromoCode);document.getElementById("cancelPromoCodeButton").addEventListener("click",closePromoCode);document.getElementById("promoCodeForm").addEventListener("submit",savePromoCodeForm);
promoCodesList.addEventListener("click",e=>{const edit=e.target.closest("[data-edit-code]"),del=e.target.closest("[data-delete-code]");if(edit)openPromoCode(managementPromoCodes.find(p=>String(p.id)===String(edit.dataset.editCode)));if(del)deletePromoCodeById(del.dataset.deleteCode)});
async function deleteOrderById(id){if(!id)return;if(!confirm("Удалить этот заказ?\n\nЗаказ и его позиции будут удалены без возможности восстановления."))return;try{await managementApi("orders","DELETE",null,id);toast("Заказ удалён");await loadOrders()}catch(e){toast(e.message,true)}}
document.getElementById("refreshOrdersButton").addEventListener("click",loadOrders);
ordersList.addEventListener("click",e=>{const b=e.target.closest("[data-delete-order]");if(b)deleteOrderById(b.dataset.deleteOrder)});
ordersList.addEventListener("change",async e=>{const s=e.target.closest("[data-order-status]");if(!s)return;const id=s.dataset.orderStatus;const before=managementOrders.find(o=>String(o.id)===String(id));const old=before?.status||s.dataset.previousStatus||"new";try{const result=await managementApi("orders","PATCH",{status:s.value},id);s.dataset.previousStatus=s.value;const item=managementOrders.find(o=>String(o.id)===String(id));if(item)item.status=s.value;const changed=old!==s.value;const n=result?.notification;let msg=changed?`Статус: ${ORDER_STATUS_LABELS[s.value]||s.value}`:"Статус заказа обновлён";if(changed){if(n?.sent)msg+=" · Клиенту отправлено уведомление";else if(n?.skipped)msg+=" · Telegram-уведомление не отправлено";else if(n?.reason)msg+=` · Уведомление не отправлено: ${n.reason}`;}toast(msg)}catch(err){toast(err.message,true);await loadOrders()}});
[promotionModal,promoCodeModal].forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.remove("open")}));
syncPromotionUI();

/* ============================================================
   TELEGRAM USER
   ============================================================ */

function showTelegramUser() {

    try {

        const user =
            TG?.initDataUnsafe?.user;


        if (!user) {
            return;
        }


        const name =
            user.first_name ||
            user.username ||
            "Администратор";


        userNameEl.textContent =
            name;

    } catch {

        // ignore

    }

}



/* HOME NAVIGATION */
const homePanel=document.getElementById('homePanel');
const homeTrigger=document.getElementById('homeTrigger');
function showHome(){
  hideExtraPanels();
  catalogPanel.classList.add('hidden');
  if(adminPanel) adminPanel.classList.remove('open');
  if(homePanel) homePanel.hidden=false;
  [catalogNavButton,promotionsNavButton,promoCodesNavButton,ordersNavButton,adminsNavButton].forEach(el=>el?.classList.remove('active'));
  closeMenu?.();
}
function hideHome(){ if(homePanel) homePanel.hidden=true; }
homeTrigger?.addEventListener('click',showHome);
document.querySelectorAll('[data-home-target]').forEach(card=>card.addEventListener('click',()=>{
  const target=card.dataset.homeTarget;
  const actions={
    catalogNavButton:()=>showCatalog(),
    promotionsNavButton:()=>{showManagementPanel(promotionsPanel,promotionsNavButton);loadManagementProducts().then(loadPromotions)},
    promoCodesNavButton:()=>{showManagementPanel(promoCodesPanel,promoCodesNavButton);loadPromoCodes()},
    ordersNavButton:()=>{showManagementPanel(ordersPanel,ordersNavButton);loadOrders()},
    adminsNavButton:()=>showAdmins()
  };
  actions[target]?.();
}));

/* ============================================================
   COMPACT MENU
   ============================================================ */
const menuTrigger=document.getElementById('menuTrigger');
const menuDrawer=document.getElementById('menuDrawer');
const menuBackdrop=document.getElementById('menuBackdrop');
const navButtons=[catalogNavButton,promotionsNavButton,promoCodesNavButton,ordersNavButton,adminsNavButton].filter(Boolean);
if(menuDrawer){menuDrawer.innerHTML=`<button type="button" class="nav-button menu-home-item" data-menu-home="1">⌂ Главная</button>`+navButtons.map(b=>`<button type="button" class="nav-button" data-menu-target="${b.id}">${b.textContent}</button>`).join('');}
function closeMenu(){if(menuDrawer)menuDrawer.classList.remove('open');if(menuBackdrop)menuBackdrop.classList.remove('open');if(menuTrigger)menuTrigger.setAttribute('aria-expanded','false');}
function openMenu(){if(menuDrawer)menuDrawer.classList.add('open');if(menuBackdrop)menuBackdrop.classList.add('open');if(menuTrigger)menuTrigger.setAttribute('aria-expanded','true');}
menuTrigger?.addEventListener('click',()=>menuDrawer?.classList.contains('open')?closeMenu():openMenu());
menuBackdrop?.addEventListener('click',closeMenu);
menuDrawer?.addEventListener('click',e=>{const home=e.target.closest('[data-menu-home]');if(home){showHome();closeMenu();return;}const b=e.target.closest('[data-menu-target]');if(!b)return;document.getElementById(b.dataset.menuTarget)?.click();closeMenu();});

/* ============================================================
   ACCESS GATE
   ============================================================ */

async function authorizeAdmin(){
  const accessError=document.getElementById("accessError");
  document.body.classList.remove("denied");
  document.body.classList.add("pending");
  if(accessError)accessError.textContent="";
  if(!TG?.initData){
    if(accessError)accessError.textContent="Админка должна быть открыта внутри Telegram WebApp.";
    document.body.classList.remove("pending");
    document.body.classList.add("denied");
    return false;
  }
  try{
    await api("GET");
    document.body.classList.remove("pending","denied");
    return true;
  }catch(error){
    console.error("ADMIN ACCESS DENIED",error);
    if(accessError)accessError.textContent=error?.message||"Недостаточно прав.";
    document.body.classList.remove("pending");
    document.body.classList.add("denied");
    return false;
  }
}

/* ============================================================
   START
   ============================================================ */

(async()=>{
  try{ TG?.ready?.(); TG?.expand?.(); }catch{}
  if(TG?.onEvent){ TG.onEvent('themeChanged',()=>document.documentElement.style.colorScheme=(TG.colorScheme==='dark'?'dark':'light')); }
  document.documentElement.style.colorScheme=(TG?.colorScheme==='light'?'light':'dark');
  if(await authorizeAdmin()){
    showTelegramUser();
    showHome();
    await loadProducts();
  }
})();
