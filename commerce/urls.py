from django.urls import path
from . import views

app_name = "commerce"

urlpatterns = [
    path("medicines/", views.medicine_list, name="medicine_list"),
    path("labs/", views.lab_test_list, name="lab_test_list"),
    path("book-test/<int:lab_id>/", views.book_lab_test, name="book_lab_test"),
    path("add-to-cart/<str:type>/<int:id>/", views.add_to_cart, name="add_to_cart"),
    path(
        "remove-from-cart/<int:item_id>/",
        views.remove_from_cart,
        name="remove_from_cart",
    ),
    path(
        "cart-update/<int:item_id>/<str:action>/",
        views.cart_update_quantity,
        name="cart_update_quantity",
    ),
    path(
        "cart-update-manual/<int:item_id>/",
        views.cart_update_manual,
        name="cart_update_manual",
    ),
    path("cart/", views.cart_view, name="cart_view"),
    path("checkout/address/", views.checkout_address, name="checkout_address"),
    path("checkout/payment/", views.checkout_payment, name="checkout_payment"),
    path("create-razorpay-order/", views.create_razorpay_order, name="create_razorpay_order"),
    path("verify-payment/", views.verify_payment, name="verify_payment"),
    path("order/", views.order_medicine, name="order_medicine"),
    path("review/<int:review_id>/edit/", views.edit_lab_review, name="edit_lab_review"),
    path("review/<int:review_id>/delete/", views.delete_lab_review, name="delete_lab_review"),
]
