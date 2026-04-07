import re

file_path = "templates/base.html"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace Navbar
navbar_pattern = re.compile(r'<nav class="navbar">.*?</nav>', re.DOTALL)
navbar_replacement = """<script>
    window.DjangoUrls = {
        home: "{% url 'home' %}",
        search: "{% url 'search' %}",
        profile: "{% if user.is_authenticated %}{% url 'profile' %}{% else %}''{% endif %}",
        cart: "{% if user.is_authenticated %}{% url 'cart_view' %}{% else %}''{% endif %}",
        reminderList: "{% if user.is_authenticated %}{% url 'reminder_list' %}{% else %}''{% endif %}",
        login: "{% url 'login' %}",
        register: "{% url 'register' %}",
        hospitalList: "{% url 'hospital_list' %}",
        doctorList: "{% url 'doctor_list' %}",
        labTestList: "{% url 'lab_test_list' %}",
        medicineList: "{% url 'medicine_list' %}",
        about: "{% url 'about' %}",
        contact: "{% url 'contact' %}",
        help: "{% url 'help' %}",
        terms: "{% url 'terms' %}",
        privacy: "{% url 'privacy' %}"
    };
    window.DjangoContext = {
        isAuthenticated: "{{ user.is_authenticated|yesno:'true,false' }}" === "true",
        userLocation: "{{ request.session.user_location|default:''|escapejs }}",
        cartCount: parseInt("{{ cart_count|default:0 }}", 10),
        hospitalSpecialties: [
            {% for s in sidebar_hospital_specialties %}
            { name: "{{ s.name|escapejs }}", iconUrl: "{% if s.icon %}{{ s.icon.url|escapejs }}{% endif %}" }{% if not forloop.last %},{% endif %}
            {% endfor %}
        ],
        doctorSpecialties: [
            {% for s in sidebar_doctor_specialties %}
            { name: "{{ s.name|escapejs }}", iconUrl: "{% if s.icon %}{{ s.icon.url|escapejs }}{% endif %}" }{% if not forloop.last %},{% endif %}
            {% endfor %}
        ],
        labCategories: [
            {% for c in sidebar_lab_categories %}
            { name: "{{ c.name|escapejs }}", iconUrl: "{% if c.icon %}{{ c.icon.url|escapejs }}{% endif %}" }{% if not forloop.last %},{% endif %}
            {% endfor %}
        ]
    };
</script>
<div id="react-navbar-root"></div>"""
content = navbar_pattern.sub(navbar_replacement, content)

# Replace Sidebar
sidebar_pattern = re.compile(r'<div class="sidebar" id="sidebar" style="overflow-y: auto;">.*?</div>\s*</div>', re.DOTALL)
content = sidebar_pattern.sub('<div id="react-sidebar-root"></div>', content)

# Replace Footer
footer_pattern = re.compile(r'<footer.*?</footer>', re.DOTALL)
content = footer_pattern.sub('<div id="react-footer-root"></div>', content)

# Remove the inline styles that were moved
style_pattern = re.compile(r'<style>\s*\.navbar-dropdown-content \{.*?</style>', re.DOTALL)
content = style_pattern.sub('', content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
