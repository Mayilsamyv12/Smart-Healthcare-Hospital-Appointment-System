from django.shortcuts import render, redirect, get_object_or_404
from .models import Medicine, Order, LabTest, CartItem, LabAppointment

from django.contrib.auth.decorators import login_required
from django.contrib import messages
import json

def medicine_list(request):
    medicines = Medicine.objects.all()
    return render(request, 'commerce/medicine_list.html', {'medicines': medicines})

def lab_test_list(request):
    tests = LabTest.objects.all()
    user_location = request.session.get('user_location')
    if user_location:
        tests = tests.filter(location__icontains=user_location)
        
    category = request.GET.get('category')
    if category:
        tests = tests.filter(category__name__icontains=category)
        
    return render(request, 'commerce/lab_test_list.html', {'tests': tests, 'current_location': user_location})


@login_required
def add_to_cart(request, type, id):
    print(f"DEBUG: add_to_cart called with type={type}, id={id}, user={request.user}")
    try:
        if type == 'medicine':
            item = get_object_or_404(Medicine, id=id)
            print(f"DEBUG: Found Medicine: {item}")
            
            # Check for existing items manually to handle duplicates if they exist
            existing_items = CartItem.objects.filter(user=request.user, medicine=item)
            if existing_items.exists():
                cart_item = existing_items.first()
                cart_item.quantity += 1
                cart_item.save()
                print("DEBUG: Updated existing medicine quantity")
                messages.info(request, f'Updated quantity for {item.name}')
                # Cleanup duplicates if any
                if existing_items.count() > 1:
                    print(f"DEBUG: Found {existing_items.count()} duplicates, cleaning up...")
                    for dup in existing_items[1:]:
                        dup.delete()
            else:
                CartItem.objects.create(user=request.user, medicine=item, quantity=1)
                print("DEBUG: Created new medicine cart item")
                messages.success(request, 'Item added to cart!')
    
    except Exception as e:
        print(f"ERROR in add_to_cart: {str(e)}")
        messages.error(request, 'An error occurred while adding to cart.')

            
    except Exception as e:
        print(f"ERROR in add_to_cart: {str(e)}")
        messages.error(request, 'An error occurred while adding to cart.')
            
    return redirect('cart_view')

@login_required
def remove_from_cart(request, item_id):
    item = get_object_or_404(CartItem, id=item_id, user=request.user)
    item.delete()
    messages.success(request, 'Item removed from cart.')
    return redirect('cart_view')





@login_required
def cart_view(request):
    items = CartItem.objects.filter(user=request.user)
    total = sum(item.get_total_price() for item in items)
    return render(request, 'commerce/cart.html', {'items': items, 'total': total})

@login_required
def checkout_address(request):
    if request.method == 'POST':
        request.session['checkout_address'] = {
            'house_no': request.POST.get('house_no'),
            'street': request.POST.get('street'),
            'landmark': request.POST.get('landmark'),
            'pincode': request.POST.get('pincode'),
            'city': request.POST.get('city'),
        }
        return redirect('checkout_payment')
    return render(request, 'commerce/checkout_address.html')

@login_required
def checkout_payment(request):
    if request.method == 'POST':
        # Retrieve address from session
        addr = request.session.get('checkout_address')
        if not addr:
            return redirect('checkout_address')
            
        payment_method = request.POST.get('payment_method')
        # Logic to handle payment details (UPI ID/Card Number) could go here
        
        # Create Order
        cart_items = CartItem.objects.filter(user=request.user)
        total = sum(item.get_total_price() for item in cart_items)
        items_json = json.dumps([{
            'name': i.medicine.name if i.medicine else i.lab_test.name,
            'price': float(i.medicine.price if i.medicine else i.lab_test.price), 
            'quantity': i.quantity
        } for i in cart_items])
        
        Order.objects.create(
            user=request.user,
            house_no=addr['house_no'],
            street=addr['street'],
            landmark=addr['landmark'],
            pincode=addr['pincode'],
            city=addr['city'],
            items=items_json,
            total_amount=total,
            payment_method=payment_method
        )
        
        # Clear Cart
        cart_items.delete()
        messages.success(request, 'Order placed successfully!')
        return redirect('profile')
        
    return render(request, 'commerce/checkout_payment.html', {'upi_id': 'msmsayil20@oksbi'})

@login_required
def order_medicine(request):
    # This might be deprecated with the new cart flow, but keeping for "Custom Order"
    return render(request, 'commerce/order_medicine.html')

@login_required
def book_lab_test(request, lab_id):
    lab_test = get_object_or_404(LabTest, id=lab_id)
    if request.method == 'POST':
        date = request.POST.get('date')
        time = request.POST.get('time')
        LabAppointment.objects.create(user=request.user, lab_test=lab_test, date=date, time=time)
        messages.success(request, 'Lab Test booked successfully!')
        return redirect('reminder_list')
    return render(request, 'commerce/book_lab_test.html', {'lab_test': lab_test})

